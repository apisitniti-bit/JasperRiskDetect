import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const UPLOAD_DIR = join(tmpdir(), "jasper-risk-detect");

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return Response.json(
        { error: "ไม่พบไฟล์ในคำขอ" },
        { status: 400 }
      );
    }

    const fileName = (file as File).name || "unknown.jrxml";

    if (!fileName.endsWith(".jrxml")) {
      return Response.json(
        { error: "รองรับเฉพาะไฟล์ .jrxml เท่านั้น" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return Response.json(
        { error: "ไฟล์ขนาดใหญ่เกินไป (สูงสุด 5MB)" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileId = randomUUID();

    await mkdir(UPLOAD_DIR, { recursive: true });
    const filePath = join(UPLOAD_DIR, `${fileId}.jrxml`);
    await writeFile(filePath, buffer);

    return Response.json({
      file_id: fileId,
      file_name: fileName,
      file_size: file.size,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    return Response.json({ error: msg }, { status: 500 });
  }
}
