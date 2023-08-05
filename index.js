const express = require('express')
const app = express();
const mongoose = require('mongoose')
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const cors = require('cors')
app.use(express.urlencoded({extended:true}))
app.use(cors())
const fs = require('fs').promises;
const fontkit = require('@pdf-lib/fontkit');
const { Readable } = require('stream');
const dotenv  = require('dotenv');
dotenv.config({'path':'./.env'});
const  MONGO_URL  = process.env.MONGO_URL;
const generatePDF = async (name, selectedCourse, selectedDate) => {
    const existingPdfBytes = await fs.readFile('./cert.pdf');
  
    // Load a PDFDocument from the existing PDF bytes
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
  
    // Register the standard fonts with the PDFDocument
    pdfDoc.registerFontkit(fontkit);
  
    // Get the standard font Helvetica
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
    //get custom font
    const fontBytes = await fs.readFile('./Sanchez-Regular.ttf');
  
    // Embed our custom font in the document
    const customFont = await pdfDoc.embedFont(fontBytes);
  
    // Get the first page of the document
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const fontSize = 58;
    const textWidth = customFont.widthOfTextAtSize(name, fontSize);
  
    // Get the width and height of the first page
    const { width, height } = firstPage.getSize();
  
    // Calculate the x and y positions to center align the text
    const xPosition = (width - textWidth) / 2;
    const yPosition = height / 4 + 90;
  
    // Draw the text in the center
    firstPage.drawText(name, {
      x: xPosition,
      y: yPosition + 50,
      size: fontSize,
      font: customFont,
      color: rgb(0.2, 0.84, 0.67),
    });
  
    // Manually position the course and date below the name
    const courseFontSize = 24;
    const dateFontSize = 18;
    const courseXPosition = 360; // Adjust the x position as needed
    const courseYPosition = 218;
    const dateXPosition = 155; // Adjust the x position as needed
    const dateYPosition = 150;
  
    firstPage.drawText(` "${selectedCourse}"`, {
      x: courseXPosition,
      y: courseYPosition,
      size: courseFontSize,
      font: customFont,
      color: rgb(0, 0, 0),
    });
  
    firstPage.drawText(`${selectedDate}`, {
      x: dateXPosition,
      y: dateYPosition,
      size: dateFontSize,
      font: customFont,
      color: rgb(0, 0, 0),
    });
  
    // Serialize the PDFDocument to bytes (a Uint8Array)
    const pdfBytes = await pdfDoc.save();
    return pdfBytes
    // console.log("Done creating");
  
    // // Create a Blob and trigger download
    // const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });
    // const pdfUrl = URL.createObjectURL(pdfBlob);
    // const link = document.createElement("a");
    // link.href = pdfUrl;
    // link.download = "Certificate.pdf";
    // link.click();
  };

  const dataSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
  });

  const Data = mongoose.model('Data', dataSchema);



  app.post('/auth', async (req, res) => {
    const { name, email, selectedCourse, selectedDate } = req.body;
  
    console.log(name, email, selectedCourse, selectedDate);
    if (!name || !email || !selectedCourse || !selectedDate) {
      return res.send("Please fill all the details");
    }

    const capitalize = (str, lower = false) =>
    (lower ? str.toLowerCase() : str).replace(/(?:^|\s|["'([{])+\S/g, (match) =>
      match.toUpperCase()
    );
  
    const capitalized_name = capitalize(name.trim());
    const trimmed_email = email.trim();
    const trimmed_selectedCourse = selectedCourse.trim();
  
    try {
        const userFound = await Data.findOne({ name: name, email: email });

        if(userFound){
            const pdfBytes = await generatePDF(capitalized_name, trimmed_selectedCourse, selectedDate);
  
            // Convert Uint8Array to Buffer
            const pdfBuffer = Buffer.from(pdfBytes);
        
            // Set the response headers to trigger the download
            res.setHeader('Content-Type', 'application/pdf');
            const url = 'https://hopingminds.com/';
            const encodedUrl = encodeURIComponent(url);
            res.setHeader('Content-Disposition', `attachment; filename="${encodedUrl}${name}.pdf"`);        
            // Send the PDF Buffer as the response
            res.send(pdfBuffer);
        }

        else{
            res.send("not valid")
        }
    
    } catch (err) {
      console.error(err);
      res.status(500).send("Error generating certificate");
    }
  });
  

mongoose.connect(MONGO_URL).then(() => {
    console.log("connected")
}).catch((err) => {
    console.log("disconnected", err)
})

app.listen(3000, () => {

    console.log("running")
})

