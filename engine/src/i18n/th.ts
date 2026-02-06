export const VERSION_GUARD_MESSAGES = {
  "VGUARD-001": {
    title: "ตรวจพบ attribute 'uuid' (JasperReports ≥4.1.1)",
    cause: "ไฟล์ JRXML ถูกสร้างด้วย JasperReports เวอร์ชัน 4.1.1 ขึ้นไป ซึ่งเพิ่ม attribute 'uuid' บน element ต่าง ๆ",
    impact: "ไม่สามารถ compile ด้วย JasperReports 3.7.1 ได้ — จะเกิด error ขณะ compile",
    fix: "เปิดไฟล์ด้วย iReport 3.7.1 แล้ว save ใหม่ หรือลบ attribute 'uuid' ออกจากทุก element ด้วยมือ",
  },
  "VGUARD-002": {
    title: "ตรวจพบ <propertyExpression> (JasperReports ≥4.0.0)",
    cause: "ไฟล์ JRXML ใช้ <propertyExpression> element ซึ่งเพิ่มใน JasperReports 4.0.0",
    impact: "JasperReports 3.7.1 ไม่รู้จัก element นี้ — จะเกิด error ขณะ compile",
    fix: "ลบ <propertyExpression> ออก แล้วใช้ <property> แบบ static value แทน",
  },
  "VGUARD-003": {
    title: "ตรวจพบ <genericElement> (JasperReports ≥3.5.0)",
    cause: "ไฟล์ใช้ <genericElement> ซึ่งรองรับตั้งแต่ JasperReports 3.5.0",
    impact: "ส่วนใหญ่ทำงานได้กับ 3.7.1 แต่อาจมีปัญหากับ element handler บางตัว",
    fix: "ตรวจสอบว่า genericElement handler ที่ใช้รองรับใน iReport 3.7.1",
  },
  "VGUARD-004": {
    title: 'ตรวจพบ <style> markup="styled" (JasperReports ≥4.0.0)',
    cause: 'ไฟล์ JRXML ใช้ markup type "styled" ใน <style> element ซึ่งมีเฉพาะใน JasperReports 4.0.0 ขึ้นไป',
    impact: "JasperReports 3.7.1 ไม่รู้จัก markup type นี้ — ข้อความจะแสดงผลไม่ถูกต้อง",
    fix: 'เปลี่ยน markup เป็น "none" หรือ "html" ซึ่งรองรับใน 3.7.1',
  },
  "VGUARD-005": {
    title: 'ตรวจพบ whenNoDataType="NoDataSection" (JasperReports ≥3.7.5)',
    cause: 'ไฟล์ JRXML ใช้ค่า "NoDataSection" สำหรับ whenNoDataType ซึ่งเพิ่มใน JasperReports 3.7.5',
    impact: "JasperReports 3.7.1 ไม่รู้จักค่านี้ — จะเกิด error ขณะ compile",
    fix: 'เปลี่ยน whenNoDataType เป็น "NoPages", "BlankPage", หรือ "AllSectionsNoDetail"',
  },
  "VGUARD-006": {
    title: "ตรวจพบ Java 8+ syntax ใน expression",
    cause: "expression ใน JRXML ใช้ syntax ของ Java 8 ขึ้นไป เช่น lambda (->), method reference (::), หรือ Stream API",
    impact: "iReport 3.7.1 ใช้ Java 6/7 compiler — expression เหล่านี้จะ compile ไม่ผ่าน",
    fix: "แก้ expression ให้ใช้ syntax Java 6/7 เท่านั้น เช่น ใช้ for loop แทน stream, ใช้ anonymous class แทน lambda",
  },
  "VGUARD-007": {
    title: "xmlns namespace ไม่ตรงกับ JasperReports",
    cause: "ไฟล์ JRXML ไม่มีหรือมี xmlns ที่ไม่ตรงกับ JasperReports มาตรฐาน",
    impact: "อาจไม่ใช่ไฟล์ JasperReports ที่ถูกต้อง หรืออาจถูกสร้างจากเครื่องมืออื่น",
    fix: 'ตรวจสอบว่า xmlns ของ <jasperReport> คือ "http://jasperreports.sourceforge.net/jasperreports"',
  },
} as const;

export const VERSION_GUARD_GENERAL = {
  not_jrxml: "ข้อผิดพลาด: ไม่พบ <jasperReport> element — ไฟล์นี้ไม่ใช่ JRXML ที่ถูกต้อง",
  rejected_prefix: "ข้อผิดพลาด: ไฟล์ JRXML นี้ถูกสร้างด้วย JasperReports เวอร์ชันที่สูงกว่า 3.7.1",
  rejected_suffix: "กรุณาใช้ไฟล์ที่สร้างด้วย iReport 3.7.1 เท่านั้น",
  warning_prefix: "คำเตือน",
  compatible: "ไฟล์ JRXML เข้ากันได้กับ iReport 3.7.1",
} as const;
