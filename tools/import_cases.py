"""
將「蘇律師案件總表.xlsx」匯入 Firestore 的 cases 集合。

設計原則（呼應 CLAUDE.md）：
- 配置驅動：欄位對應集中於 HEADER_TO_FIELD，調整對應只改這裡。
- 異常處理：缺檔、缺金鑰、缺參數皆給出明確中文錯誤，不靜默失敗。
- 首次執行自動檢查並安裝 requirements.txt 的依賴。

使用方式（owner 以 email 或 uid 擇一指定）：
    python tools/import_cases.py --owner-email 你的登入email --owner-name 蘇翊瑄 --dry-run
    python tools/import_cases.py --owner-email 你的登入email --owner-name 蘇翊瑄

    # 或直接指定 UID：
    python tools/import_cases.py --owner-uid <Firebase Auth UID> --owner-name 蘇翊瑄

服務金鑰：Firebase 主控台 → 專案設定 → 服務帳戶 → 產生新的私密金鑰，
下載後命名為 serviceAccountKey.json 放在專案根目錄（已列入 .gitignore）。
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


def ensure_dependencies() -> None:
    """首次執行時檢查並安裝所需依賴（CLAUDE.md 規範）。"""
    try:
        import openpyxl  # noqa: F401
        import firebase_admin  # noqa: F401
    except ImportError:
        req = Path(__file__).resolve().parent / "requirements.txt"
        print("偵測到缺少依賴，正在安裝 requirements.txt …")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", str(req)])
        print("依賴安裝完成。\n")


# Excel 表頭（去除換行/空白後）對應到 Firestore 欄位名稱。
HEADER_TO_FIELD = {
    "收件日": "receiptDate",
    "類型": "caseType",
    "當事人": "client",
    "對造": "opposingParty",
    "案由": "caseReason",
    "電話": "phone",
    "案號": "caseNumber",
    "住址": "address",
    "處理": "handling",
    "日程/理由": "schedule",
    "地院地檢": "court",
    "委任狀遞出時間": "mandateDate",
    "委任範圍": "mandateScope",
    "結果": "result",
    "狀態": "status",
    "報稅": "taxStatus",
}

# 所有案件欄位（缺漏者補空字串，確保文件結構一致）。
ALL_FIELDS = list(dict.fromkeys(HEADER_TO_FIELD.values()))


def normalize_header(value: object) -> str:
    """表頭正規化：去除換行與空白，便於對應。"""
    return str(value or "").replace("\n", "").replace(" ", "").strip()


def clean_value(value: object) -> str:
    """儲存格值轉為乾淨字串；浮點整數去除 .0。"""
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    if isinstance(value, datetime):
        return value.strftime("%Y.%m.%d")
    return str(value).strip()


def parse_sheet(worksheet) -> list[dict]:
    """解析單一工作表，回傳案件 dict 清單（已過濾標頭與空列）。"""
    rows = list(worksheet.iter_rows(values_only=True))
    if not rows:
        return []

    header_index = {normalize_header(h): idx for idx, h in enumerate(rows[0])}
    field_columns = {
        field: header_index[norm]
        for norm, field in HEADER_TO_FIELD.items()
        if norm in header_index
    }

    records: list[dict] = []
    for raw_row in rows[1:]:
        record = {
            field: clean_value(raw_row[col]) if col < len(raw_row) else ""
            for field, col in field_columns.items()
        }
        # 跳過子標頭列與空列：當事人、類型、案號皆空者視為非資料列。
        if not (record.get("client") or record.get("caseType") or record.get("caseNumber")):
            continue
        records.append(record)
    return records


def build_case_doc(record: dict, owner_uid: str, owner_name: str, now_iso: str) -> dict:
    """組出符合前端 CaseRecord 結構的 Firestore 文件。"""
    doc = {field: record.get(field, "") for field in ALL_FIELDS}
    doc.update(
        {
            "responsibleLawyerUid": owner_uid,
            "responsibleLawyerName": owner_name,
            "progressEntries": [],
            "closed": False,
            "closedAt": None,
            "createdByUid": owner_uid,
            "createdAt": now_iso,
            "updatedAt": now_iso,
        }
    )
    return doc


def load_records(excel_path: Path) -> list[dict]:
    """讀取 Excel 全部工作表並合併案件（含法扶分頁）。"""
    import openpyxl

    if not excel_path.exists():
        raise FileNotFoundError(f"找不到 Excel 檔：{excel_path}")

    workbook = openpyxl.load_workbook(excel_path, data_only=True)
    all_records: list[dict] = []
    for worksheet in workbook.worksheets:
        sheet_records = parse_sheet(worksheet)
        print(f"  - 工作表「{worksheet.title}」：{len(sheet_records)} 筆")
        all_records.extend(sheet_records)
    return all_records


def init_admin(service_account: Path) -> None:
    """初始化 firebase-admin（重複呼叫安全）。"""
    import firebase_admin
    from firebase_admin import credentials

    if not service_account.exists():
        raise FileNotFoundError(
            f"找不到服務金鑰：{service_account}\n"
            "請至 Firebase 主控台 → 專案設定 → 服務帳戶 → 產生新的私密金鑰，"
            "下載後命名為 serviceAccountKey.json 放在專案根目錄。"
        )
    if not firebase_admin._apps:
        firebase_admin.initialize_app(credentials.Certificate(str(service_account)))


def resolve_owner_uid(email: str) -> str:
    """以 email 透過 Admin SDK 查出帳號 UID（需先 init_admin）。"""
    from firebase_admin import auth

    try:
        return auth.get_user_by_email(email).uid
    except Exception as error:  # noqa: BLE001
        raise RuntimeError(
            f"查不到登入 email「{email}」對應的帳號，請確認該帳號已在系統註冊過。原因：{error}"
        ) from error


def write_to_firestore(docs: list[dict]) -> None:
    """以批次寫入 Firestore（每批 400 筆，避免單批上限）。需先 init_admin。"""
    from firebase_admin import firestore

    client = firestore.client()
    collection = client.collection("cases")

    batch_size = 400
    for start in range(0, len(docs), batch_size):
        batch = client.batch()
        for doc in docs[start : start + batch_size]:
            batch.set(collection.document(), doc)
        batch.commit()
        print(f"  已寫入 {min(start + batch_size, len(docs))} / {len(docs)} 筆")


def main() -> None:
    parser = argparse.ArgumentParser(description="匯入案件總表至 Firestore")
    parser.add_argument("--excel", default="data/蘇律師案件總表.xlsx", help="Excel 檔路徑")
    parser.add_argument("--service-account", default="serviceAccountKey.json", help="Firebase 服務金鑰 JSON")
    parser.add_argument("--owner-uid", help="負責律師帳號的 Firebase Auth UID（與 --owner-email 擇一）")
    parser.add_argument("--owner-email", help="負責律師的登入 email，自動解析出 UID（與 --owner-uid 擇一）")
    parser.add_argument("--owner-name", default="蘇翊瑄", help="負責律師顯示姓名")
    parser.add_argument("--dry-run", action="store_true", help="僅解析與預覽，不寫入 Firestore")
    args = parser.parse_args()

    if not args.owner_uid and not args.owner_email:
        raise ValueError("請提供 --owner-uid 或 --owner-email 其中之一，指定案件負責律師。")

    base_dir = Path(__file__).resolve().parent.parent
    excel_path = (base_dir / args.excel) if not Path(args.excel).is_absolute() else Path(args.excel)
    sa_path = (base_dir / args.service_account) if not Path(args.service_account).is_absolute() else Path(args.service_account)

    print(f"讀取 Excel：{excel_path}")
    records = load_records(excel_path)
    print(f"共解析 {len(records)} 筆案件。")

    # 需要寫入或需以 email 解析 UID 時，初始化 Admin SDK。
    owner_uid = args.owner_uid
    if args.owner_email or not args.dry_run:
        init_admin(sa_path)
    if args.owner_email:
        owner_uid = resolve_owner_uid(args.owner_email)
        print(f"已解析 email {args.owner_email} → UID {owner_uid}")

    now_iso = datetime.now(timezone.utc).isoformat()
    docs = [build_case_doc(r, owner_uid or "<dry-run>", args.owner_name, now_iso) for r in records]

    if args.dry_run:
        print("\n[dry-run] 不寫入。前 3 筆預覽：")
        for doc in docs[:3]:
            preview = {k: doc[k] for k in ("client", "caseType", "caseNumber", "status")}
            print("  ", preview)
        return

    print(f"\n寫入 Firestore（負責律師：{args.owner_name} / {owner_uid}）…")
    write_to_firestore(docs)
    print("匯入完成。")


if __name__ == "__main__":
    ensure_dependencies()
    try:
        main()
    except Exception as error:  # noqa: BLE001
        print(f"\n[匯入失敗] {error}", file=sys.stderr)
        sys.exit(1)
