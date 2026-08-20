const PDFDocument = require("pdfkit");

function generateLeadsPdf(leads, title) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 50
      });

      const chunks = [];

      doc.on("data", (chunk) => {
        chunks.push(chunk);
      });

      doc.on("end", () => {
        resolve(Buffer.concat(chunks));
      });

      doc.on("error", reject);

      doc.fontSize(20).text("ВИРТУАЛЬНЫЙ СЕКРЕТАРЬ", {
        align: "center"
      });

      doc.moveDown(0.5);

      doc.fontSize(16).text(title, {
        align: "center"
      });

      doc.moveDown();

      doc.fontSize(10).text(
        `Дата формирования: ${new Date().toLocaleString("ru-RU")}`
      );

      doc.text(`Количество записей: ${leads.length}`);

      doc.moveDown();

      leads.forEach((lead, index) => {
        const fullName = [lead.first_name, lead.last_name]
          .filter(Boolean)
          .join(" ");

        doc
          .fontSize(13)
          .text(`Запись #${lead.id}`, {
            underline: true
          });

        doc.moveDown(0.3);

        doc.fontSize(10);

        doc.text(`Клиент: ${fullName || "Без имени"}`);

        doc.text(
          `Username: ${
            lead.username ? "@" + lead.username : "не указан"
          }`
        );

        doc.text(`Телефон: ${lead.phone || "-"}`);

        doc.text(`Дата заявки: ${lead.created_at || "-"}`);

        doc.text(`Запись: ${lead.booking_text || "-"}`);

        doc.text(
          `Оформлена: ${
            lead.booked_at
              ? lead.booked_at
              : "не оформлена"
          }`
        );

        doc.moveDown();

        if (index < leads.length - 1) {
          doc
            .moveTo(50, doc.y)
            .lineTo(545, doc.y)
            .stroke();

          doc.moveDown();
        }
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  generateLeadsPdf
};