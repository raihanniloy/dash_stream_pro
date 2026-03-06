import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { pythonFetch } from "@/lib/python-client";
import fs from "fs";
import path from "path";

const MAX_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = new Set(["csv", "xlsx", "txt"]);

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File exceeds 50MB limit" },
      { status: 400 }
    );
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (!ALLOWED_TYPES.has(ext)) {
    return NextResponse.json(
      { error: "Supported formats: CSV, XLSX, TXT" },
      { status: 400 }
    );
  }

  const dataSourceId = uuid();
  const uploadDir = path.join(
    process.cwd(),
    "uploads",
    session.userId,
    dataSourceId
  );
  fs.mkdirSync(uploadDir, { recursive: true });

  const filePath = path.join(uploadDir, `original.${ext}`);
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(filePath, buffer);

  const sheetName = formData.get("sheetName") as string | null;

  try {
    const result = await pythonFetch("/process/upload", {
      file_path: filePath,
      file_type: ext,
      sheet_name: sheetName,
    });

    db()
      .prepare(
        `INSERT INTO data_sources (id, user_id, filename, file_path, file_type, file_size, sheet_name, row_count, column_count, profile_json, parsed_path)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        dataSourceId,
        session.userId,
        file.name,
        filePath,
        ext,
        file.size,
        sheetName,
        result.row_count,
        result.column_count,
        JSON.stringify(result.profile),
        result.parsed_path
      );

    return NextResponse.json({
      id: dataSourceId,
      filename: file.name,
      row_count: result.row_count,
      column_count: result.column_count,
      columns: result.columns,
      profile: result.profile,
    });
  } catch (err: unknown) {
    fs.rmSync(uploadDir, { recursive: true, force: true });
    const message = err instanceof Error ? err.message : "Failed to process file";
    return NextResponse.json(
      { error: message },
      { status: 422 }
    );
  }
}
