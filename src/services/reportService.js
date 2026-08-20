const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

function createReportService({ leadRepository }) {

  function formatDate(date) {
    const [year, month, day] = date.split("-");

    return `${day}.${month}.${year}`;
  }

  function createPdf({
    leads,
    title,
    fromDate,
    toDate,
    outputPath
  }) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: "A4",
          margin: 50
        });

        const stream = fs.createWriteStream(outputPath);

        stream.on("finish", () => {
          resolve(outputPath);
        });

        stream.on("error", reject);

        doc.pipe(stream);

        // Шрифт с поддержкой кириллицы
        const fontPath = path.join(
          process.cwd(),
          "assets",
          "fonts",
          "DejaVuSans.ttf"
        );

        doc.font(fontPath);

        // Заголовок
        doc
          .fontSize(20)
          .text("ОТЧЁТ ПО ЗАПИСЯМ", {
            align: "center"
          });

        doc.moveDown();

        // Период
        if (fromDate === toDate) {
          doc
            .fontSize(12)
            .text(`Дата: ${formatDate(fromDate)}`, {
              align: "center"
            });
        } else {
          doc
            .fontSize(12)
            .text(
              `Период: ${formatDate(fromDate)} — ${formatDate(toDate)}`,
              {
                align: "center"
              }
            );
        }

        doc.moveDown(2);

        if (!leads.length) {
          doc
            .fontSize(14)
            .text("Записей за выбранный период нет.", {
              align: "center"
            });

          doc.end();
          return;
        }

        leads.forEach((lead, index) => {

          const fullName = [
            lead.first_name,
            lead.last_name
          ]
            .filter(Boolean)
            .join(" ") || "Без имени";

          doc
            .fontSize(13)
            .text(
              `${index + 1}. ${fullName}`,
              {
                continued: false
              }
            );

          doc
            .fontSize(10)
            .text(`Дата: ${formatDate(lead.booking_date)}`);

          doc
            .fontSize(10)
            .text(`Время: ${lead.booking_time || "-"}`);

          doc
            .fontSize(10)
            .text(`Телефон: ${lead.phone || "-"}`);

          doc
            .fontSize(10)
            .text(
              `Username: ${
                lead.username
                  ? "@" + lead.username
                  : "-"
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

        doc.moveDown();

        doc
          .fontSize(12)
          .text(
            `Всего записей: ${leads.length}`,
            {
              align: "right"
            }
          );

        doc.end();

      } catch (error) {
        reject(error);
      }
    });
  }

  async function generateReport({
    fromDate,
    toDate,
    title
  }) {

    const leads =
      leadRepository.getLeadsByDateRange(
        fromDate,
        toDate
      );

    const reportsDir = path.join(
      process.cwd(),
      "data",
      "reports"
    );

    fs.mkdirSync(reportsDir, {
      recursive: true
    });

    const fileName =
      `report_${fromDate}_${toDate}.pdf`;

    const outputPath =
      path.join(reportsDir, fileName);

    await createPdf({
      leads,
      title,
      fromDate,
      toDate,
      outputPath
    });

    return {
      outputPath,
      leads
    };
  }

  return {
    generateReport
  };
}

module.exports = {
  createReportService
};