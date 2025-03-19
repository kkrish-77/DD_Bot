"use strict";
const imageToBase64 = require("image-to-base64");
const axios = require("axios");
const WhatsappCloudAPI = require("whatsappcloudapi_wrapper");
const express = require("express");
const { Storage } = require("@google-cloud/storage");
const mongoose = require("mongoose");
const fs = require("fs");
const nunjucks = require("nunjucks");
const pdf = require("html-pdf");
const puppeteer = require("puppeteer");
const { Session } = require("inspector");
const { platform } = require("os");
// const { stringAt } = require("pdfkit/js/data");

require("dotenv").config();

const partyNames = {
  canonBhiwandi: "Canon India Pvt Ltd, Bhiwandi",
  carestreamBhiwandi: "Carestream Health India Pvt Ltd, Bhiwandi",
  henkelBhiwandi: "Henkel Adhesive Technologies India Pvt Ltd, Bhiwandi",
  henkelKoperkhairane: "Henkel Adhesive Technologies India Pvt Ltd, Koperkhairane",
  tosohIndiaPvtLtd: "Tosoh India Pvt Ltd",
};

let browser = {};
let rightTick, noTick, camera, mic;

(async () => {
  browser = await puppeteer.launch();
  rightTick = await imageToBase64("./checkmark.png");
  noTick = await imageToBase64("./cancel.png");
  camera = await imageToBase64("./camera.png");
  mic = await imageToBase64("./microphone.png");
})();
const currentDate = new Date();

// Update options to include time zone
const options = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
  timeZone: "Asia/Kolkata", // Indian time zone
};

const todaysDateString = currentDate.toLocaleString("en-IN", options);
const todaysDate = todaysDateString.split(",")[0].trim();

console.log(todaysDate, "this is todays date");
// Use 'en-US' as the locale for the US date format
const finalDateAndTime = currentDate.toLocaleString("en-IN", options);
// vehicle from db of todaysdate

// Replace the comma if needed
const finalDateAndTimeFormat = finalDateAndTime.replace(",", "");

const Schema = mongoose.Schema;

const safetyCheckSchema = new Schema({
  checklistdatetime: String,
  checklistdate: String,
  recipientPhone: String,
  safety: String,
  leaks: String,
  vehicle: String,
  emergency: String,
  flammable: String,
  hooks: String,
  videoLink: String,
  audioLink: String,
  vehicleNumber: String,
  arrivalDate: String,
  arrivalTime: String,
  lock: String,
  sparechock: String,
  hydraulic: String,
  belt: String,
  tyre: String,
  safetyLink: String,
  hooksLink: String,
  hydraulicLink: String,
  partyname: String,
  otherparty:  String,
  status: String,
  gateindate: String,
  gateintime: String,
  loadingdate: String,
  loadingtime: String,
  endloadingdate: String,
  endloadingtime: String,
  firstphoto: String,
  firstphotobase: String,
  secondphoto: String,
  secondphotobase: String,
  thirdphoto: String,
  thirdphotobase: String,
  ewaybillphoto: String,
  ewaybillphotobase: String,
  taxinvoicephoto: String,
  taxinvoicephotobase: String,
  bcchallanphoto: String,
  bcchallanphotobase: String,
  mcchallanphoto: String,
  mcchallanphotobase: String,
  gcnumber: String,
  ewaynumber: String,
  dlexpiry: String,
  dlno: String,
  npexpiry: String,
  rcexpiry: String,
  pucexpiry: String,
  fitexpiry: String,
  departuredate: String,
  departuretime: String,
  
});

const othervehiclesafetyCheckSchema = new Schema({
  recipientPhone: String,
  safety: String,
  vehicle: String,
  emergency: String,
  flammable: String,
  videoLink: String,
  audioLink: String,
  vehicleNumber: String,
  arrivalDate: String,
  arrivalTime: String,
  sparechock: String,
  belt: String,
  tyre: String,
  safetyLink: String,
  hooksLink: String,
  hydraulicLink: String,
  partyname: String,
  otherparty:  String,
  status: String,
  gateindate: String,
  gateintime: String,
  loadingdate: String,
  loadingtime: String,
  endloadingdate: String,
  endloadingtime: String,
  firstphoto: String,
  secondphoto: String,
  thirdphoto: String,
  ewaybillphoto: String,
  taxinvoicephoto: String,
  bcchallanphoto: String,
  mcchallanphoto: String,
  gcphoto: String,
  gcnumber: String,
  ewaynumber: String,
  dlexpiry: String,
  dlno: String,
  npexpiry: String,
  rcexpiry: String,
  pucexpiry: String,
  fitexpiry: String,
  departuredate: String,
  departuretime: String,
});
const ewayBillSchema = new Schema({
  vehicleNo: String,
  eWayBillNo: String,
  data: Schema.Types.Mixed,
});

const SafetyCheck = mongoose.model("SafetyCheck", safetyCheckSchema);
const OtherVehicel = mongoose.model("OtherVehicel", othervehiclesafetyCheckSchema);
const EwayBill = mongoose.model.EWayBill || mongoose.model("EwayBill", ewayBillSchema);

const session = new Map();

const app = express();
const router = express.Router();

async function DDgetdata() {
  try {
    const response = await axios.get(
      "https://script.google.com/macros/s/AKfycbyPbrjZWf33iLNn6A8YQmMg8wzeBH_SzHK229ZM55tMuhq4f0xRccTLz_hweiq5KujvOw/exec?action=getUser"
    );

    return response.data;
  } catch (error) {
    console.error("Error fetching data:", error);
    return [];
  }
}
async function uploadFileToBucket(fileName) {
  const blob = storage.bucket(bucketName).file(fileName);
  const blobStream = blob.createWriteStream({ resumable: false });

  return await new Promise((resolve, reject) => {
    blobStream.on("error", (error) => {
      console.log("Error uploading file", error);

      reject({
        status: "failed",
        message: "Failed to upload",
        error: error.message,
      });
    });

    blobStream.on("finish", async () => {
      try {
        const [url] = await blob.getSignedUrl({
          action: "read",
          expires: "01-01-2030",
        });
        resolve({
          status: "success",
          message: "Uploaded the file successfully",
          url,
        });
      } catch (error) {
        console.log("Error uploading file", error);

        reject({
          status: "failed",
          message: `Uploaded the file successfully: ${fileName}, but public access is denied!`,
          error: error.message,
        });
      }
    });
  });
}

async function fetchData() {
  try {
    let data = await DDgetdata();
    return data;
  } catch (error) {
    console.error("Error fetching data:", error);
    return [];
  }
}

async function storeEwayBillData(ewayBillNo) {
  try {
    const response = await axios.get(
      `https://api-gateway.cxipl.com/api/v1/eway-bill/?ewayBillNo=${ewayBillNo}
      `,
      {
        headers: {
          authKey: "HQ9DFJ7KTJVNS28JP61DTKD5XHX22Z26",
        },
      }
    );

    const ewayBillData = response.data;

    if (ewayBillData.success) {
      const newEwayBill = new EwayBill({
        eWayBillNo: ewayBillNo,
        data: ewayBillData.data.data,
      });

      await newEwayBill.save();

      return ewayBillData;
    }

    return false;
  } catch (error) {
    console.error("Error storing eWay bill data:", error);
    throw error;
  }
}

async function findDriver(driverNumber) {
  const dataaa = await fetchData();

  const foundDriver = dataaa.find((item) => item.drivernumber == driverNumber);

  if (foundDriver) {
    return foundDriver;
  } else {
    return;
  }
}

const Whatsapp = new WhatsappCloudAPI({
  accessToken: process.env.Meta_WA_accessToken,
  senderPhoneNumberId: process.env.Meta_WA_SenderPhoneNumberId,
  WABA_ID: process.env.Meta_WA_wabaId,
});

const WHATSAPP_API = axios.create({
  baseURL: `https://graph.facebook.com/v17.0/${process.env.Meta_WA_SenderPhoneNumberId}`,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.Meta_WA_accessToken}`,
  },
});

const pdfObj = {
  safety: {
    title:
      "Please Send Safety Shoes / Helmet / Jacket Photo | कृपया सुरक्षा जूते / हेलमेट / जैकेट की फोटो भेजें।",
    img: "data:image/png;base64,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",
  },
  leaks: {
    title: "Check for leaks / लीक की जांच करें",
    img: "data:image/png;base64,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",
  },
  vehicle: {
    title: "Vehicle and Transport Document / वाहन और परिवहन दस्तावेज़",
    img: "data:image/png;base64,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",
  },
  emergency: {
    title: "Emergency Procedure Explained / आपातकालीन प्रक्रिया समझाना",
    img: "data:image/png;base64,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",
  },
  tyre: {
    title:
      "Check Tyre Profile and Absence Of Damage (E.g :- Puncture.) टायर ोफ़ाइल और हािन केअनुपिथित केजांच कर(जैसे:- पंचर।)",
    img: "data:image/png;base64,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",
  },
  belt: {
    title: "Seat Belt / सीट बेल्ट",
    img: "data:image/png;base64,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",
  },
  hydraulic: {
    title:
      "Hydraulic check for both upper decks along with proper vehicle / उचित वाहन के साथ दोनों ऊपरी डेक के लिए हाइड्रोलिक जांच",
    img: "",
  },
  sparechock: {
    title:
      "Check for a spare wheel and at least one wheel chock per vehicle / प्रति वाहन एक अतिरिक्त पहिया और कम से कम एक पहिया चोक की जाँच करें",
    img: "data:image/png;base64,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",
  },
  flammable: {
    title: "No flammable items inside driver cabin / ड्राइवर केबिन के अंदर कोई ज्वलनशील वस्तु नहीं",
    img: "data:image/png;base64,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",
  },
  hooks: {
    title:
      "Check for safety belts along with hooks at upper decks ऊपरी डके पर :क केसाथ सुरा बे.ट क जांच कर",
    img: "",
  },
  lock: {
    title:
      "All safety locks and rest locks checking and side safety plates\nसभी सुरक्षा ताले और बाकी ताले की जाँच और साइड सुरक्षा प्लेटें",
    img: "",
  },
};

const othervehiclepdfObj = {
  safety: {
    title:
      "Please Send Safety Shoes / Helmet / Jacket Photo | कृपया सुरक्षा जूते / हेलमेट / जैकेट की फोटो भेजें।",
    img: "data:image/png;base64,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",
  },
  vehicle: {
    title: "Vehicle and Transport Document / वाहन और परिवहन दस्तावेज़",
    img: "data:image/png;base64,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",
  },
  emergency: {
    title: "Emergency Procedure Explained / आपातकालीन प्रक्रिया समझाना",
    img: "data:image/png;base64,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",
  },
  tyre: {
    title:
      "Check Tyre Profile and Absence Of Damage (E.g :- Puncture.) टायर ोफ़ाइल और हािन केअनुपिथित केजांच कर(जैसे:- पंचर।)",
    img: "data:image/png;base64,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",
  },
  belt: {
    title: "Seat Belt / सीट बेल्ट",
    img: "data:image/png;base64,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",
  },
  sparechock: {
    title:
      "Check for a spare wheel and at least one wheel chock per vehicle / प्रति वाहन एक अतिरिक्त पहिया और कम से कम एक पहिया चोक की जाँच करें",
    img: "data:image/png;base64,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",
  },
  flammable: {
    title: "No flammable items inside driver cabin / ड्राइवर केबिन के अंदर कोई ज्वलनशील वस्तु नहीं",
    img: "data:image/png;base64,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",
  },
  hooks: {
    title: "Check for safety belts or Tarpaulin / सुरक्षा बेल्ट और तारपॉलिन की जाँच ",
    img: "",
  },
  platform: {
    title: "Check Vehicle Platform\nवाहन प्लेटफ़ॉर्म चेक करें",
    img: "",
  },
};

// const pdfObj = {
//   safety: {
//     title: "Safety shoes / सुरक्षा के जूते",
//   },
//   leaks: {
//     title: "Check for leaks / लीक की जांच करें",
//   },
//   vehicle: {
//     title: "Vehicle and Transport Document / वाहन और परिवहन दस्तावेज़",
//   },
//   emergency: {
//     title: "Emergency Procedure Explained / आपातकालीन प्रक्रिया समझाना",
//   },
//   tyre: {
//     title:
//       "Check Tyre Profile and Absence Of Damage (E.g :- Puncture.) टायर ोफ़ाइल और हािन केअनुपिथित केजांच कर(जैसे:- पंचर।)",
//   },
//   belt: {
//     title: "Seat Belt / सीट बेल्ट",
//   },
//   hydraulic: {
//     title:
//       "Hydraulic check for both upper decks along with proper vehicle / उचित वाहन के साथ दोनों ऊपरी डेक के लिए हाइड्रोलिक जांच",
//     img: "",
//   },
//   sparechock: {
//     title:
//       "Check for a spare wheel and at least one wheel chock per vehicle / प्रति वाहन एक अतिरिक्त पहिया और कम से कम एक पहिया चोक की जाँच करें",
//   },
//   flammable: {
//     title: "No flammable items inside driver cabin / ड्राइवर केबिन के अंदर कोई ज्वलनशील वस्तु नहीं",
//   },
//   hooks: {
//     title:
//       "Check for safety belts along with hooks at upper decks ऊपरी डके पर :क केसाथ सुरा बे.ट क जांच कर",
//     img: "",
//   },
//   lock: {
//     title:
//       "All safety locks and rest locks checking and side safety plates\nसभी सुरक्षा ताले और बाकी ताले की जाँच और साइड सुरक्षा प्लेटें",
//     img: "",
//   },
// };

router.get("/meta_wa_callbackurl", (req, res) => {
  try {
    console.log("GET: Someone is pinging me!");

    let mode = req.query["hub.mode"];
    let token = req.query["hub.verify_token"];
    let challenge = req.query["hub.challenge"];

    if (mode && token && mode === "subscribe" && "123" === token) {
      return res.status(200).send(challenge);
    } else {
      return res.sendStatus(403);
    }
  } catch (error) {
    console.error({ error });
    return res.sendStatus(500);
  }
});

router.post("/meta_wa_callbackurl", async (req, res) => {
  console.log("POST: Someone is pinging me!");
  try {
    const message = Whatsapp.parseMessage(req.body);

    try {
      if (isMessage(message)) {
        const { incomingMessage, recipientName, recipientPhone, typeOfMsg, message_id, timestamp } =
          parseMessage(message.message);

        if (isMessageRecent(timestamp)) {
          if (!session.has(recipientPhone)) {
            session.set(recipientPhone, {
              isRegistered: false,
            });
          }

          console.log(incomingMessage);

          if (typeOfMsg === "text_message") {
            const sessionType = session.get(recipientPhone).session;

            if (incomingMessage.text.body.toUpperCase() === "APML") {
              //   console.log({todaysDate})
              //             const dbData = await SafetyCheck.find({ checklistdate: todaysDate });
              //  console.log(dbData,"dbData")

              //  const todayChecklistData = dbData.filter(item => item.checklistdate === todaysDate);

              //  const vehicleNumbers = todayChecklistData.map(item => item.vehicleNumber);

              //  console.log("Vehicle numbers for today's date:", vehicleNumbers);

              let message1 =
                "Please Select The Below Buttons \nकृपया नीचे दिए गए बटन का चयन करें। 😊";
              const listOfButtons = [
                {
                  title: "New Vehicle",
                  id: `newvehicle`,
                },
                {
                  title: "Pending Task",
                  id: `pendingtask`,
                },
              ];
              await sendSimpleButtons(message1, listOfButtons, recipientPhone);
            } else if (sessionType === "gcphotoend") {
              let gcNumber = incomingMessage.text.body.toUpperCase();

              session.get(recipientPhone).gc_Number = gcNumber;

              session.get(recipientPhone).session = "ewaymanual";
              const docId = session.get(recipientPhone).docId;
              console.log(docId, "docId");
              const res = await SafetyCheck.updateOne(
                { _id: docId },
                { gcnumber: gcNumber, status: "gcnumbercomplete" }
              );
              console.log(res);

              const message = "Please type the E-way bill Number. \nकृपया ई-वे बिल नंबर टाइप करें।";
              await sendTextMessage(message, recipientPhone);
            } else if (sessionType === "ewaymanual") {
              // const ewayBillData = await storeEwayBillData(ewayNumber);
              // console.log("E-way bill data stored:", ewayBillData);

              let ewayNumbers = incomingMessage.text.body
                .split(",")
                .map((number) => number.trim().toUpperCase());

              console.log({ ewayNumbers });
              for (const ewayNumber of ewayNumbers) {
                // Store E-way bill data (assuming storeEwayBillData function is defined elsewhere)
                const ewayBillData = await storeEwayBillData(ewayNumber);
                console.log("E-way bill data stored:", ewayBillData);

                session.get(recipientPhone).eway_Number = ewayNumber;

                session.get(recipientPhone).session = "departure";
                const docId = session.get(recipientPhone).docId;
                console.log(docId, "docId");
                const res = await SafetyCheck.updateOne(
                  { _id: docId },
                  { ewaynumber: ewayNumber, status: "" }
                );
                console.log(res);

                const message =
                  "When the truck is ready to head to the destination, click on the Departure button 🚚\nजब ट्रक डेस्टिनेशन में जाने के लिए रवाना हो गया है तब Departure button में क्लिक करें 🚚";
                const listOfButtons = [
                  {
                    title: "Departure",
                    id: `departure@${docId}`,
                  },
                ];
                await sendSimpleButtons(message, listOfButtons, recipientPhone);
              }
            }
          } else if (typeOfMsg === "media_message") {
            const sessionType = session.get(recipientPhone).session;
            const imageId = incomingMessage.image.id;
            const docId = session.get(recipientPhone).docId;

            if (sessionType === "safetyShoesPhoto") {
              const fileName = `${recipientPhone}-safety_shoes_photo.jpg`;

              const mediaUrl = await getMediaUrl(imageId);
              const isUploaded = await uploadToBucket(mediaUrl, fileName);
              const isSaved = await downloadAndSave(mediaUrl, fileName);

              const imgSrc = await imageToBase64(`./${fileName}`);

              session.get(recipientPhone).safety.link = isUploaded.url;
              session.get(recipientPhone).safety.photo = imgSrc;

              // console.log(,"THIS IS AFTER FLOW SESSION");
              // session.get(recipientPhone).safety.photo = `${__dirname}/${fileName}`;
              session.get(recipientPhone).session = "safetyBeltPhoto";

              const message =
                "Please Send Safety Belt /tarpaulin  Photo \n कृपया सुरक्षा बेल्ट / तिरपाल की फोटो भेजें।";
              await sendTextMessage(message, recipientPhone);
            } else if (sessionType === "safetyBeltPhoto") {
              const fileName = `${recipientPhone}-safety_Belt_photo.jpg`;

              const mediaUrl = await getMediaUrl(imageId);
              const isUploaded = await uploadToBucket(mediaUrl, fileName);
              const isSaved = await downloadAndSave(mediaUrl, fileName);

              const imgSrc = await imageToBase64(`./${fileName}`);

              session.get(recipientPhone).hooks.link = isUploaded.url;
              session.get(recipientPhone).hooks.photo = imgSrc;
              // session.get(recipientPhone).hooks.photo = `${__dirname}/${fileName}`;

              session.get(recipientPhone).session = "hydraulicUpper";

              const message =
                "Please Send Hydraulic Check Upper Photo \n कृपया  हाइड्रोलिक चेक ऊपरी की फोटो भेजें। 📸";
              await sendTextMessage(message, recipientPhone);
            } else if (sessionType === "hydraulicUpper") {
              const fileName = `${recipientPhone}-hydraulic_upper_photo.jpg`;

              const mediaUrl = await getMediaUrl(imageId);
              const isUploaded = await uploadToBucket(mediaUrl, fileName);
              const isSaved = await downloadAndSave(mediaUrl, fileName);

              const imgSrc = await imageToBase64(`./${fileName}`);

              session.get(recipientPhone).hydraulic.link = isUploaded.url;
              session.get(recipientPhone).hydraulic.photo = imgSrc;
              // session.get(recipientPhone).hydraulic.photo = `${__dirname}/${fileName}`;
              session.get(recipientPhone).session = "hydraulicLower";

              const message =
                "Please Send Hydraulic Check Lower Photo \n कृपया हाइड्रोलिक चेक निचली की फोटो भेजें। 📸";
              await sendTextMessage(message, recipientPhone);
            } else if (sessionType === "hydraulicLower") {
              const fileName = `${recipientPhone}-hydraulic_lower_photo.jpg`;

              const mediaUrl = await getMediaUrl(imageId);
              const isUploaded = await uploadToBucket(mediaUrl, fileName);
              const isSaved = await downloadAndSave(mediaUrl, fileName);

              session.get(recipientPhone).session = "hydraulicCheck";

              const message =
                "Please Send Video Of Hydraulic Check \n कृपया हाइड्रोलिक चेक का वीडियो भेजें। 📸";
              await sendTextMessage(message, recipientPhone);
            } else if (sessionType === "loadedTruckphoto") {
              const fileName = `${recipientPhone}-loaded1_Truck_photo.jpg`;

              const mediaUrl = await getMediaUrl(imageId);
              const isUploaded = await uploadToBucket(mediaUrl, fileName);
              const isSaved = await downloadAndSave(mediaUrl, fileName);
              const imgSrc = await imageToBase64(`./${fileName}`);

              session.get(recipientPhone).loaded1_Truck_photolink = isUploaded.url;
              session.get(recipientPhone).loaded1_Truck_photo = imgSrc;

              session.get(recipientPhone).session = "2loadedTruckphoto";
              console.log(docId, "docId");

              const res = await SafetyCheck.updateOne(
                { _id: docId },
                { firstphoto: isUploaded.url, firstphotobase: imgSrc, status: "firstphotocomplete" }
              );
              console.log(res);

              const message = "Second Photo \nदूसरी तस्वीर 📸";
              await sendTextMessage(message, recipientPhone);
            } else if (sessionType === "2loadedTruckphoto") {
              const fileName = `${recipientPhone}-loaded_Truck_photo.jpg`;

              const mediaUrl = await getMediaUrl(imageId);
              const isUploaded = await uploadToBucket(mediaUrl, fileName);
              const isSaved = await downloadAndSave(mediaUrl, fileName);
              const imgSrc = await imageToBase64(`./${fileName}`);

              session.get(recipientPhone).loaded2_Truck_photolink = isUploaded.url;
              session.get(recipientPhone).loaded2_Truck_photo = imgSrc;
              session.get(recipientPhone).docId = docId;

              session.get(recipientPhone).session = "3loadedTruckphoto";
              console.log(docId, "docId");

              const res = await SafetyCheck.updateOne(
                { _id: docId },
                {
                  secondphoto: isUploaded.url,
                  secondphotobase: imgSrc,
                  status: "secondphotocomplete",
                }
              );
              console.log(res);

              const message = "Third Photo📷 \n तीसरी फ़ोटो 📷";
              await sendTextMessage(message, recipientPhone);
            } else if (sessionType === "3loadedTruckphoto") {
              const fileName = `${recipientPhone}-3loaded_Truck_photo.jpg`;

              const mediaUrl = await getMediaUrl(imageId);
              const isUploaded = await uploadToBucket(mediaUrl, fileName);
              const isSaved = await downloadAndSave(mediaUrl, fileName);
              const imgSrc = await imageToBase64(`./${fileName}`);

              session.get(recipientPhone).loaded3_Truck_photolink = isUploaded.url;
              session.get(recipientPhone).loaded3_Truck_photo = imgSrc;

              session.get(recipientPhone).session = "ewayBill";
              const docId = session.get(recipientPhone).docId;
              console.log(docId, "docId,docId");
              const res = await SafetyCheck.updateOne(
                { _id: docId },
                { thirdphoto: isUploaded.url, thirdphotobase: imgSrc, status: "thirdphotocomplete" }
              );
              console.log(res);
              let message =
                "After the loading process is complete, kindly click on the 'End Loading' button. 🌟\nलोडिंग पूरी होने के बाद, कृपया 'एंड लोडिंग' बटन पर क्लिक करें। 🌟";

              const listOfButtons = [
                {
                  title: "End Loading",
                  id: `endloading@${docId}`,
                },
              ];
              await sendSimpleButtons(message, listOfButtons, recipientPhone);

              // const messages =
              //   "Please send the photo of the E-way bill. 📸\nकृपया ई-वे बिल की तस्वीर भेजें। 📸";
              // await sendTextMessage(messages, recipientPhone);
            } else if (sessionType === "taxinvoice") {
              const fileName = `${recipientPhone}-taxinvoice_photo.jpg`;

              const mediaUrl = await getMediaUrl(imageId);
              const isUploaded = await uploadToBucket(mediaUrl, fileName);
              const isSaved = await downloadAndSave(mediaUrl, fileName);
              const imgSrc = await imageToBase64(`./${fileName}`);

              session.get(recipientPhone).taxinvoice_photolink = isUploaded.url;
              session.get(recipientPhone).taxinvoice_photo = imgSrc;

              session.get(recipientPhone).session = "billty_Challan";
              console.log(docId, "docId");
              const res = await SafetyCheck.updateOne(
                { _id: docId },
                {
                  taxinvoicephoto: isUploaded.url,
                  taxinvoicephotobase: imgSrc,
                  status: "taxinvoicephotocomplete",
                }
              );
              console.log(res);

              const message =
                "Please send the photo of the Bilty Challan. 📸\nकृपया बिल्टी चालान की फोटो भेजें। 📷 ";
              await sendTextMessage(message, recipientPhone);
            } else if (sessionType === "manualchallan") {
              const fileName = `${recipientPhone}-manualchallan_photo.jpg`;

              const mediaUrl = await getMediaUrl(imageId);
              const isUploaded = await uploadToBucket(mediaUrl, fileName);
              const isSaved = await downloadAndSave(mediaUrl, fileName);
              const imgSrc = await imageToBase64(`./${fileName}`);

              session.get(recipientPhone).manualchallan_photolink = isUploaded.url;
              session.get(recipientPhone).manualchallan_photo = imgSrc;
              console.log(docId, "docId");
              const res = await SafetyCheck.updateOne(
                { _id: docId },
                {
                  mcchallanphoto: isUploaded.url,
                  mcchallanphotobase: imgSrc,
                  status: "mcchallanphotocomplete",
                }
              );
              console.log(res);
              session.get(recipientPhone).session = "gcphotoend";

              const message = "Please Type GC Number 🔍 \nकृपया GC नंबर टाइप करें  ";
              await sendTextMessage(message, recipientPhone);
            } else if (sessionType === "billty_Challan") {
              const fileName = `${recipientPhone}-billty_Challanphoto.jpg`;

              const mediaUrl = await getMediaUrl(imageId);
              const isUploaded = await uploadToBucket(mediaUrl, fileName);
              const isSaved = await downloadAndSave(mediaUrl, fileName);
              const imgSrc = await imageToBase64(`./${fileName}`);

              session.get(recipientPhone).billty_Challanlink = isUploaded.url;
              session.get(recipientPhone).billty_Challanphoto = imgSrc;

              session.get(recipientPhone).session = "manualchallan";
              console.log(docId, "docId");
              const res = await SafetyCheck.updateOne(
                { _id: docId },
                {
                  bcchallanphoto: isUploaded.url,
                  bcchallanphotobase: imgSrc,
                  status: "bcchallanphotocomplete",
                }
              );
              console.log(res);

              const message =
                "Please send the photo of Manual Challan (MC). 📸\n कृपया मैन्युअल चालान (एमसी) की फोटो भेजें ।📸";
              await sendTextMessage(message, recipientPhone);
            } else if (sessionType === "ewayBill") {
              const fileName = `${recipientPhone}-Eway_Bill_photo.jpg`;

              const mediaUrl = await getMediaUrl(imageId);
              const isUploaded = await uploadToBucket(mediaUrl, fileName);
              const isSaved = await downloadAndSave(mediaUrl, fileName);
              const imgSrc = await imageToBase64(`./${fileName}`);

              session.get(recipientPhone).Eway_Billlink = isUploaded.url;
              session.get(recipientPhone).Eway_Billphoto = imgSrc;
              session.get(recipientPhone).session = "taxinvoice";
              console.log(docId, "docId");
              const res = await SafetyCheck.updateOne(
                { _id: docId },
                {
                  ewaybillphoto: isUploaded.url,
                  ewaybillphotobase: imgSrc,
                  status: "ewaybillphotocomplete",
                }
              );
              console.log(res);

              const message =
                "Please send the photo of Tax Invoice Of Goods. 📸\n कृपया माल की टैक्स इनवॉयस की फोटो भेजें। 📸";
              await sendTextMessage(message, recipientPhone);
            }

            /// OTHER VEHICLE PHOTOS
            else if (sessionType === "othervehiclesafetyShoesPhoto") {
              const fileName = `${recipientPhone}-other_vehilce_safety_shoes_photo.jpg`;

              const mediaUrl = await getMediaUrl(imageId);
              const isUploaded = await uploadToBucket(mediaUrl, fileName);
              const isSaved = await downloadAndSave(mediaUrl, fileName);

              const imgSrc = await imageToBase64(`./${fileName}`);

              session.get(recipientPhone).safety.link = isUploaded.url;
              session.get(recipientPhone).safety.photo = imgSrc;

              // console.log(,"THIS IS AFTER FLOW SESSION");
              // session.get(recipientPhone).safety.photo = `${__dirname}/${fileName}`;
              session.get(recipientPhone).session = "vehicleplatform";

              const message =
                "Please Send Vehicle Platform Photo \n कृपया वाहन प्लेटफ़ॉर्म की फोटो भेजें। 📸";
              await sendTextMessage(message, recipientPhone);
            } else if (sessionType === "vehicleplatform") {
              const fileName = `${recipientPhone}-vehicleplatform_photo.jpg`;

              const mediaUrl = await getMediaUrl(imageId);
              const isUploaded = await uploadToBucket(mediaUrl, fileName);
              const isSaved = await downloadAndSave(mediaUrl, fileName);

              const imgSrc = await imageToBase64(`./${fileName}`);

              session.get(recipientPhone).platform.link = isUploaded.url;
              session.get(recipientPhone).platform.photo = imgSrc;

              // console.log(,"THIS IS AFTER FLOW SESSION");
              // session.get(recipientPhone).safety.photo = `${__dirname}/${fileName}`;

              if (session.get(recipientPhone).send.flowMessage.belt.check === "yes") {
                session.get(recipientPhone).session = "othersafetyBeltPhoto";
                const message =
                  "Please Send Safety Belt / tarpaulin  Photo \n कृपया सुरक्षा बेल्ट / तिरपाल की फोटो भेजें। 📸";
                await sendTextMessage(message, recipientPhone);
              } else {
                session.get(recipientPhone).session = "truckvideo";

                const message = "Please Send Video Of Truck \n कृपया ट्रक का वीडियो भेजें। 📸";
                await sendTextMessage(message, recipientPhone);
              }
            } else if (sessionType === "othersafetyBeltPhoto") {
              const fileName = `${recipientPhone}-othersafety_Belt_photo.jpg`;

              const mediaUrl = await getMediaUrl(imageId);
              const isUploaded = await uploadToBucket(mediaUrl, fileName);
              const isSaved = await downloadAndSave(mediaUrl, fileName);

              const imgSrc = await imageToBase64(`./${fileName}`);
              // console.log(session.get(recipientPhone));

              // session.get(recipientPhone).hooks = {}

              session.get(recipientPhone).hooks.link = isUploaded.url;
              session.get(recipientPhone).hooks.photo = imgSrc;
              // session.get(recipientPhone).hooks.photo = `${__dirname}/${fileName}`;

              session.get(recipientPhone).session = "truckvideo";

              const message = "Please Send Video Of Truck \n कृपया ट्रक का वीडियो भेजें। 📸";
              await sendTextMessage(message, recipientPhone);
            }
          } else if (incomingMessage.interactive?.type === "nfm_reply") {
            const flow = incomingMessage.interactive.nfm_reply.response_json;

            if (flow) {
              const flowMessage = JSON.parse(flow);

              console.log(flowMessage);

              if (flowMessage.flow_token === "flows-builder-be227ccb") {
                let curr = "safetyShoesPhoto";

                if (flowMessage.safety === "no") {
                  if (flowMessage.belt === "no") {
                    if (flowMessage.hydraulic === "no") {
                      curr = "hydraulicLower";

                      const message =
                        "Please Send Hydraulic Check Lower Photo \n कृपया हाइड्रोलिक चेक निचली की फोटो भेजें। 📸";
                      await sendTextMessage(message, recipientPhone);
                    } else {
                      curr = "hydraulicUpper";

                      const message =
                        "Please Send Hydraulic Check Upper Photo \n कृपया  हाइड्रोलिक चेक ऊपरी की फोटो भेजें। 📸";
                      await sendTextMessage(message, recipientPhone);
                    }
                  } else {
                    curr = "safetyBeltPhoto";

                    const message =
                      "Please Send Safety Belt /tarpaulin  Photo \n कृपया सुरक्षा बेल्ट / तिरपाल की फोटो भेजें।";
                    await sendTextMessage(message, recipientPhone);
                  }
                } else {
                  const message =
                    "Please Send Safety Shoes / Helmet / Jacket Photo \n कृपया सुरक्षा जूते / हेलमेट / जैकेट की फोटो भेजें। 📸";
                  sendTextMessage(message, recipientPhone);
                }

                const obj = createSessionObj(flowMessage, pdfObj);

                //   console.log(obj.safety.check ,"objjjjjjjj")
                session.set(recipientPhone, {
                  ...obj,
                  arrivalDate: new Date(Number(flowMessage.arrivaldate)),
                  arrivalTime: flowMessage.arrivaltime,
                  partyname: flowMessage.partyname,
                  vehicleno: flowMessage.vehicleno,
                  otherparty: flowMessage.otherparty,
                  driverno: `91${flowMessage.driverno}`,
               
                  dlexpiry:  new Date(Number(flowMessage.dlexpiry)).toLocaleDateString(),
                  dlno: flowMessage.dlno,
                  npexpiry:  new Date(Number(flowMessage.npexpiry)).toLocaleDateString(),
                  rcexpiry:  new Date(Number(flowMessage.rcexpiry)).toLocaleDateString(),
                  pucexpiry:  new Date(Number(flowMessage.pucexpiry)).toLocaleDateString(),
                  fitexpiry: new Date(Number(flowMessage.fitexpiry)).toLocaleDateString(),
                  session: curr,
                  // session: "voiceNote",
                });

                console.log(session, "this is session message");
              } else if (flowMessage.flow_token === "flows-builder-1f42ba0c") {
                let next = "othervehiclesafetyShoesPhoto";
                if (flowMessage.safety === "no") {
                  if (flowMessage.platform === "no") {
                    if (flowMessage.belt === "no") {
                      next = "truckvideo";
                      const message =
                        "Please Send Video Of Truck \n कृपया ट्रक का वीडियो भेजें। 📸";
                      await sendTextMessage(message, recipientPhone);
                    }
                  } else {
                    next = "vehicleplatform";
                    const message =
                      "Please Send Vehicle Platform Photo \n कृपया वाहन प्लेटफ़ॉर्म की फोटो भेजें। 📸";
                    sendTextMessage(message, recipientPhone);
                  }
                } else {
                  const message =
                    "Please Send Safety Shoes / Helmet / Jacket Photo \n कृपया सुरक्षा जूते / हेलमेट / जैकेट की फोटो भेजें। 📸";
                  sendTextMessage(message, recipientPhone);
                }

                const otherobj = createSessionObj(flowMessage, othervehiclepdfObj);

                session.set(recipientPhone, {
                  ...otherobj,
                  arrivalDate: new Date(Number(flowMessage.arrivaldate)),
                  arrivalTime: flowMessage.arrivaltime,
                  partyname: flowMessage.partyname,
                  vehicleno: flowMessage.vehicleno,
                  otherparty: flowMessage.otherparty,
                  driverno: `91${flowMessage.driverno}`,
                  dlexpiry:  new Date(Number(flowMessage.dlexpiry)).toLocaleDateString(),
                  dlno: flowMessage.dlno,
                  npexpiry:  new Date(Number(flowMessage.npexpiry)).toLocaleDateString(),
                  rcexpiry:  new Date(Number(flowMessage.rcexpiry)).toLocaleDateString(),
                  pucexpiry:  new Date(Number(flowMessage.pucexpiry)).toLocaleDateString(),
                  fitexpiry: new Date(Number(flowMessage.fitexpiry)).toLocaleDateString(),
                
                  session: next,
                  send: {
                    flowMessage,
                  },
                  // session: "voiceNote",
                });

                console.log(session, "this is session message");

                // console.log(session,"this is session message");
              } else if (flowMessage.flowName === "pendingtask") {
                const { vehicleno } = flowMessage;

                const [docId, status, vehicleNumber] = vehicleno.split("@");

                session.get(recipientPhone).docId = docId;

                if (status === "preLoadingcomplete") {
                  let message1 =
                    "Now that you've completed the vehicle checklist, please click on the 'Gate In' button when at hub🚚✅\n\nवाहन जांच-सूची पूरी कर ली गई है, कृपया हब पर होते समय 'गेट इन' बटन पर क्लिक करें। 🚚✅";
                  const listOfButtons = [
                    {
                      title: "Gate IN (गेट इन)",
                      id: `gatein@${vehicleNumber}@${docId}`,
                    },
                  ];
                  await sendSimpleButtons(message1, listOfButtons, recipientPhone);
                  // var dbId = checkList._id.toString();
                  // const res = await SafetyCheck.updateOne(
                  //   { _id: dbId },
                  //   { status: "preLoadingcomplete" }
                  // );
                  // console.log(res);
                } else if (status === "gateincomplete") {
                  // console.log(buttonId, "this is bt");/
                  // console.log({ buttonId });
                  // var parts = buttonId.split("@")[1].split("&");
                  // let doccid = parts[1];
                  // const [, vehiclenumber, docId, drivernoo] = buttonId.split("@");
                  // const vehiclenumber = buttonId.match(/gatein-(.*?)@/);
                  // const drivernoo = parts[2];

                  // let status = incomingMessage.button_reply.title;
                  let gateintimee = finalDateAndTimeFormat;

                  let gateinDate = gateintimee.slice(0, 10);
                  let rawgateinTime = gateintimee.slice(11, 19);
                  let hoursMinutes = rawgateinTime.slice(0, 5);

                  // session.get(recipientPhone).vehiclenumber = vehiclenumber;
                  // session.get(recipientPhone).drivernoo = drivernoo;
                  // session.get(recipientPhone).gateinDate = gateinDate;
                  // session.get(recipientPhone).gateinTime = hoursMinutes + gateintimee.slice(19, 22);

                  const finalgateinTime = hoursMinutes + gateintimee.slice(19, 22);

                  // console.log(session, "seesion after gatein");
                  let message =
                    "After entering the hub gate, when the vehicle is loading, please click on the 'Start Loading' button 🚛🔄\nगेट में पहुंचने के बाद, जब वाहन लोड हो रहा हो, कृपया 'स्टार्ट लोडिंग' बटन पर क्लिक करें! 🚛🔄";
                  const listOfButtons = [
                    {
                      title: "Start Loading",
                      id: `startloading@${docId}`,
                    },
                  ];

                  await sendSimpleButtons(message, listOfButtons, recipientPhone);
                  console.log(docId, "docId");
                  const res = await SafetyCheck.updateOne(
                    { _id: docId },
                    {
                      gateindate: gateinDate,
                      gateintime: finalgateinTime,
                      status: "gateincomplete",
                    }
                  );
                  // console.log(res);
                } else if (status === "startloadingcomplete") {
                  // const [, docId] = buttonId.split("@");

                  console.log({ status, docId });

                  // let startLoading = incomingMessage.button_reply.title;
                  let loadingTimee = finalDateAndTimeFormat;
                  let loadingDate = loadingTimee.slice(0, 10);
                  let rawloadingTime = loadingTimee.slice(11, 19);
                  let hoursMinutes = rawloadingTime.slice(0, 5);

                  session.get(recipientPhone).loadingTime =
                    hoursMinutes + loadingTimee.slice(19, 22);
                  session.get(recipientPhone).loadingDate = loadingDate;

                  const finalloadingtime = hoursMinutes + loadingTimee.slice(19, 22);
                  session.get(recipientPhone).session = "loadedTruckphoto";

                  let message =
                    "Please send Total 3 photos  of the loaded truck one by one.🚚\nकृपया भरे गए ट्रक की कुल 3 तस्वीरें एक के बाद एक भेजें। 🚚\n\nFirst Photo\nपहली तस्वीर 📸";

                  sendTextMessage(message, recipientPhone);
                  console.log(docId, "docId");
                  const res = await SafetyCheck.updateOne(
                    { _id: docId },
                    {
                      loadingdate: loadingDate,
                      loadingtime: finalloadingtime,
                      status: "startloadingcomplete",
                    }
                  );

                  console.log(res);
                } else if (status === "endloadingcomplete") {
                  let endloadingTimee = finalDateAndTimeFormat;
                  let endloadingeDate = endloadingTimee.slice(0, 10);
                  let rawendloadingTime = endloadingTimee.slice(11, 19);
                  let hoursMinutes = rawendloadingTime.slice(0, 5);

                  session.get(recipientPhone).docId = docId;
                  session.get(recipientPhone).endloadingeDate = endloadingeDate;
                  session.get(recipientPhone).endloadingTime =
                    hoursMinutes + endloadingTimee.slice(19, 22);

                  const finalendloadingtime = hoursMinutes + endloadingTimee.slice(19, 22);
                } else if (status === "firstphotocomplete") {
                  session.get(recipientPhone).session = "2loadedTruckphoto";

                  const message = "Second Photo \nदूसरी तस्वीर 📸";
                  await sendTextMessage(message, recipientPhone);
                } else if (status === "secondphotocomplete") {
                  session.get(recipientPhone).session = "3loadedTruckphoto";

                  const message = "Third Photo📷 \n तीसरी फ़ोटो 📷";
                  await sendTextMessage(message, recipientPhone);
                } else if (status === "thirdphotocomplete") {
                  let message =
                    "After the loading process is complete, kindly click on the 'End Loading' button. 🌟\nलोडिंग पूरी होने के बाद, कृपया 'एंड लोडिंग' बटन पर क्लिक करें। 🌟";

                  const listOfButtons = [
                    {
                      title: "End Loading",
                      id: `endloading@${docId}`,
                    },
                  ];

                  await sendSimpleButtons(message, listOfButtons, recipientPhone);
                } else if (status === "ewaybillphotocomplete") {
                  session.get(recipientPhone).session = "taxinvoice";

                  const message =
                    "Please send the photo of Tax Invoice Of Goods. 📸\n कृपया माल की टैक्स इनवॉयस की फोटो भेजें। 📸";
                  await sendTextMessage(message, recipientPhone);
                } else if (status === "taxinvoicephotocomplete") {
                  session.get(recipientPhone).session = "billty_Challan";

                  const message =
                    "Please send the photo of the Bilty Challan. 📸\nकृपया बिल्टी चालान की फोटो भेजें। 📷 ";
                  await sendTextMessage(message, recipientPhone);
                } else if (status === "bcchallanphotocomplete") {
                  session.get(recipientPhone).session = "manualchallan";

                  const message =
                    "Please send the photo of Manual Challan (MC). 📸\n कृपया मैन्युअल चालान (एमसी) की फोटो भेजें ।📸";
                  await sendTextMessage(message, recipientPhone);
                } else if (status === "mcchallanphotocomplete") {
                  session.get(recipientPhone).session = "gcphoto";

                  const message =
                    "Please send the photo of Ground Challan (GC). 📸\n   कृपया ग्राउंड चालान (जीसी) की तस्वीर भेजें। 📸";
                  await sendTextMessage(message, recipientPhone);
                } else if (status === "gcphotocomplete") {
                  session.get(recipientPhone).session = "gcphotoend";

                  const message = "Please Type GC Number 🔍 \nकृपया GC नंबर टाइप करें  ";
                  await sendTextMessage(message, recipientPhone);
                } else if (status === "gcphotocomplete") {
                  session.get(recipientPhone).session = "departure";
                  const docId = session.get(recipientPhone).docId;

                  const message =
                    "When the truck is ready to head to the destination, click on the Departure button 🚚\nजब ट्रक डेस्टिनेशन में जाने के लिए रवाना हो गया है तब Departure button में क्लिक करें 🚚";
                  const listOfButtons = [
                    {
                      title: "Departure",
                      id: `departure@${docId}`,
                    },
                  ];
                  await sendSimpleButtons(message, listOfButtons, recipientPhone);
                }
              }
            }
          } else if (incomingMessage.video && incomingMessage.video.id) {
            const sessionType = session.get(recipientPhone).session;
            const videoId = incomingMessage.video.id;

            if (sessionType === "hydraulicCheck") {
              const fileName = `${recipientPhone}-hydraulic_video.mp4`;

              const mediaUrl = await getMediaUrl(videoId);
              const isSaved = await uploadToBucket(mediaUrl, fileName);

              const hydraulic_video = isSaved.url;

              session.get(recipientPhone).videoLink = hydraulic_video;

              session.get(recipientPhone).session = "voiceNote";

              const message = "Please Send Voice. \n कृपया आवाज़ भेजें।";
              await sendTextMessage(message, recipientPhone);
            } else if (sessionType === "truckvideo") {
              const fileName = `${recipientPhone}-truckvideo_video.mp4`;

              const mediaUrl = await getMediaUrl(videoId);
              const isSaved = await uploadToBucket(mediaUrl, fileName);

              const truckvideo = isSaved.url;

              session.get(recipientPhone).videoLink = truckvideo;

              session.get(recipientPhone).session = "othervoiceNote";

              const message = "Please Send Voice.\n कृपया आवाज़ भेजें।";
              await sendTextMessage(message, recipientPhone);
            }
          } else if (incomingMessage.audio && incomingMessage.audio.id) {
            const sessionType = session.get(recipientPhone).session;
            const audioId = incomingMessage.audio.id;

            if (sessionType === "voiceNote") {
              const fileName = `${recipientPhone}-voiceNote.mp3`;

              const mediaUrl = await getMediaUrl(audioId);
              const isSaved = await uploadToBucket(mediaUrl, fileName);

              const hydraulic_audio = isSaved.url;

              session.get(recipientPhone).audioLink = hydraulic_audio;
              session.get(recipientPhone).session = "";

              // console.log(session, "session durinh audio");

              const userObj = session.get(recipientPhone);

              // console.log(userObj, "this is userObj");
              const dbObj = convertObject(userObj);

              console.log(dbObj, "this  is dbObj");

              const checkList = await SafetyCheck.create({
                ...dbObj,
                recipientPhone,
                checklistdatetime: currentDate.toLocaleString("en-IN", options),
                checklistdate: todaysDate,
                videoLink: userObj.videoLink,
                audioLink: userObj.audioLink,
                arrivalDate: userObj.arrivalDate.toLocaleDateString(),
                arrivalTime: userObj.arrivalTime,
                driverNumber: userObj.driverno,
                vehicleNumber: userObj.vehicleno.toUpperCase(),
                partyname: userObj.partyname,
                otherparty: userObj.otherparty,
                dlexpiry: userObj.dlexpiry,
                dlno: userObj.dlno,
                npexpiry: userObj.npexpiry,
                rcexpiry: userObj.rcexpiry,
                pucexpiry: userObj.pucexpiry,
                fitexpiry: userObj.fitexpiry,

              });

              userObj.arrivalDate = userObj.arrivalDate.toLocaleDateString();
              // userObj.dlexpiry =  userObj.dlexpiry.toLocaleDateString(),
             
              // userObj.npexpiry= userObj.npexpiry.toLocaleDateString(),
              // userObj.rcexpiry=   userObj.rcexpiry.toLocaleDateString(),
              // userObj.pucexpiry=  userObj.pucexpiry.toLocaleDateString(),
              // userObj.fitexpiry= userObj.fitexpiry.toLocaleDateString() 

              const driver = await findDriver(userObj.driverno);

            //  console.log( userObj, "this is userobjh")
              const obj = createPdfObj(userObj);

              // console.log(obj, "this is");

              if (driver) {
                Object.assign(obj, driver);
              }

              obj.right = rightTick;
              obj.cancel = noTick;
              obj.video = camera;
              obj.voice = mic;

              const message =
                "Thank you your details has been submitted. \n धन्यवाद, आपका विवरण सबमिट कर दिया गया है।🙏";
              await sendTextMessage(message, recipientPhone);

              const templateFilePath = "./sop2.html";
              const outputFileName = `${recipientPhone}-sop.pdf`;

              const renderedTemplate = nunjucks.render(templateFilePath, obj);

              // console.log(renderedTemplate);

              await createPdf(renderedTemplate, outputFileName);
              const uploadPdf = await uploadFileToGoogleBucket(outputFileName)
              console.log(uploadPdf);

              if (session.get(recipientPhone).partyname === "CanonIndiaPvtLtdBhiwandi") {
                const clientPhoneNumber = [
                  // "919673666807",
                  // "919892735892",
                  // "919920337350",
                  // "919821481356",
                    "919730945316",
                  // "919820544415",
                  // "919999789215",
                ];

                for (const phone of clientPhoneNumber) {
                  const templateMessage = {
                    messaging_product: "whatsapp",
                    recipient_type: "individual",
                    to: phone,
                    type: "template",
                    template: {
                      name: "check_list_01",
                      language: {
                        code: "en_US",
                      },
                      components: [
                        {
                          type: "header",
                          parameters: [
                            {
                              type: "document",
                              document: {
                                link: uploadPdf,
                              },
                            },
                          ],
                        },
                      ],
                    },
                  };
                  await WHATSAPP_API.post("/messages", templateMessage);
                }
              }

              await Whatsapp.sendDocument({
                recipientPhone,
                file_path: `./${outputFileName}`,
                caption: "dd checklist",
              });

              let message1 =
                "Now that you've completed the vehicle checklist, please click on the 'Gate In' button when at hub🚚✅ \n वाहन जांच-सूची पूरी हो चुकी है, कृपया हब पर होते समय 'गेट इन' बटन पर क्लिक करें. 🚚✅";

              const listOfButtons = [
                {
                  title: "Gate IN",
                  id: `gatein@${checkList.vehicleNumber}@${checkList._id.toString()}`,
                },
              ];
              await sendSimpleButtons(message1, listOfButtons, recipientPhone);

              var dbId = checkList._id.toString();
              console.log(dbObj, "this  is dbObj");

              const res = await SafetyCheck.updateOne(
                { _id: dbId },
                { status: "preLoadingcomplete" }
              );

              console.log(res);

              session.delete(recipientPhone);
            } else if (sessionType === "othervoiceNote") {
              const fileName = `${recipientPhone}-othervoiceNote.mp3`;

              const mediaUrl = await getMediaUrl(audioId);
              const isSaved = await uploadToBucket(mediaUrl, fileName);

              const othervoiceNote = isSaved.url;

              session.get(recipientPhone).audioLink = othervoiceNote;
              session.get(recipientPhone).session = "";

              // console.log(session, "session durinh audio");

              const userObj = session.get(recipientPhone);

              console.log(userObj, "this is userObj");
              const dbObj = convertObject(userObj);

              console.log(dbObj, "this  is dbObj");

              const checkList = await SafetyCheck.create({
                ...dbObj,
                recipientPhone,
                checklistdatetime: currentDate.toLocaleString("en-IN", options),
                checklistdate: todaysDate,
                videoLink: userObj.videoLink,
                audioLink: userObj.audioLink,
                arrivalDate: userObj.arrivalDate.toLocaleDateString(),
                arrivalTime: userObj.arrivalTime,
                driverNumber: userObj.driverno,
                vehicleNumber: userObj.vehicleno.toUpperCase(),
                partyname: userObj.partyname,
                otherparty: userObj.otherparty,
                dlexpiry: userObj.dlexpiry,
                dlno: userObj.dlno,
                npexpiry: userObj.npexpiry,
                rcexpiry: userObj.rcexpiry,
                pucexpiry: userObj.pucexpiry,
                fitexpiry: userObj.fitexpiry,
                
              });

              userObj.arrivalDate = userObj.arrivalDate.toLocaleDateString();
              // userObj.dlexpiry =  userObj.dlexpiry.toLocaleDateString(),
             
              // userObj.npexpiry= userObj.npexpiry.toLocaleDateString(),
              // userObj.rcexpiry=   userObj.rcexpiry.toLocaleDateString(),
              // userObj.pucexpiry=  userObj.pucexpiry.toLocaleDateString(),
              // userObj.fitexpiry= userObj.fitexpiry.toLocaleDateString() 
              const driver = await findDriver(userObj.driverno);

              // console.log( userObj, "this is userobjh")
              const obj = createPdfObj(userObj);

              // console.log(obj, "this is");

              if (driver) {
                Object.assign(obj, driver);
              }

              obj.right = rightTick;
              obj.cancel = noTick;
              obj.video = camera;
              obj.voice = mic;

              const message =
                "Thank you your details has been submitted. \n धन्यवाद, आपका विवरण सबमिट कर दिया गया है. 🙏";
              await sendTextMessage(message, recipientPhone);

              const templateFilePath = "./othercl.html";
              const outputFileName = `${recipientPhone}-othercl.pdf`;

              const renderedTemplate = nunjucks.render(templateFilePath, obj);

              // console.log(renderedTemplate);

              await createPdf(renderedTemplate, outputFileName);
              const uploadedPdf = await uploadFileToGoogleBucket(outputFileName)
              console.log(uploadedPdf);
              if (session.get(recipientPhone).partyname === "CanonIndiaPvtLtdBhiwandi") {
                const clientPhoneNumber = [
                  "919673666807",
                  "919892735892",
                  "919920337350",
                  "919821481356",
                  "919730945316",
                  "919820544415",
                  "919999789215",
                ];

                for (const phone of clientPhoneNumber) {
                  const templateMessage = {
                    messaging_product: "whatsapp",
                    recipient_type: "individual",
                    to: phone,
                    type: "template",
                    template: {
                      name: "other_vehicle_checklist",
                      language: {
                        code: "en_US",
                      },
                      components: [
                        {
                          type: "header",
                          parameters: [
                            {
                              type: "document",
                              document: {
                                link: uploadedPdf,
                              },
                            },
                          ],
                        },
                      ],
                    },
                  };
                  await WHATSAPP_API.post("/messages", templateMessage);
                }
              }

              await Whatsapp.sendDocument({
                recipientPhone,
                file_path: `./${outputFileName}`,
                caption: "Other Vehicle checklist",
              });
              let message1 =
                "Now that you've completed the vehicle checklist, please click on the 'Gate In' button when at 🚚✅ \n वाहन जांच-सूची पूरी हो चुकी है, कृपया हब पर होते समय 'गेट इन' बटन पर क्लिक करें. 🚚✅";
              const listOfButtons = [
                {
                  title: "Gate IN",
                  id: `gatein@${checkList.vehicleNumber}@${checkList._id.toString()}`,
                },
              ];
              await sendSimpleButtons(message1, listOfButtons, recipientPhone);
              session.delete(recipientPhone);
            }
          } else if (typeOfMsg === "simple_button_message") {
            const buttonId = incomingMessage.button_reply.id;
            const docId = session.get(recipientPhone).docId;
            // console.log(session, "session in simple_button_message");
            if (buttonId === "newvehicle") {
              let message1 = "please Select The vehicle Type \n कृपया वाहन का प्रकार चुनें। 🚚";
              const listOfButtons = [
                {
                  title: "DoubleDecker Vehicle",
                  id: `ddvehicle`,
                },
                {
                  title: "Other Vehicle",
                  id: `othervehicle`,
                },
              ];
              await sendSimpleButtons(message1, listOfButtons, recipientPhone);
            } else if (buttonId === "ddvehicle") {
              const message =
                " \n\n 🌐 Welcome to APML Double Decker CheckList Form! \n\n 🌐 APML डबल डेकर चेकलिस्ट फ़ॉर्म में आपका स्वागत है! ";

              const flowData = {
                screen: "dd_check_list",
                data: {
                  partyNames: [
                    {
                      id: "CanonIndiaPvtLtdBhiwandi",
                      title: "Canon India Pvt Ltd, Bhiwandi",
                    },
                    {
                      id: "carestreamBhiwandi",
                      title: "Carestream Health India Pvt Ltd, Bhiwandi",
                    },
                    {
                      id: "henkelBhiwandi",
                      title: "Henkel Adhesive Technologies India Pvt Ltd, Bhiwandi",
                    },
                    {
                      id: "henkelKoperkhairane",
                      title: "Henkel Adhesive Technologies India Pvt Ltd, Koperkhairane",
                    },
                    {
                      id: "tosohIndiaPvtLtd",
                      title: "Tosoh India Pvt Ltd",
                    },
                  ],
                },
              };

              await sendFlow({
                body: message,
                flow_data: flowData,
                flow_cta: "DD Checklist",
                flow_id: "332189139549878",
                flow_token: "flows-builder-be227ccb",
                recipientPhone,
              });
            } else if (buttonId === "pendingtask") {
              async function fetchDataAndProcess() {
                try {
                  return await SafetyCheck.find(
                    {
                      status: { $ne: "departurecomplete" },
                      recipientPhone: String(recipientPhone),
                    },
                    { _id: 1, vehicleNumber: 1, status: 1 }
                  );
                } catch (error) {
                  console.error("Error fetching data:", error);
                }
              }

              const pendingTasks = await fetchDataAndProcess();

              if (Array.isArray(pendingTasks) && pendingTasks.length > 0) {
                const message = " \n\n 🌐 Please select Vehicle Number \n\n ";

                const flowData = {
                  screen: "Edit_Notifications",
                  data: {
                    all_extras: pendingTasks.map((task) => ({
                      id: `${task._id.toString()}@${task.status}@${task.vehicleNumber}`,
                      title: task.vehicleNumber,
                    })),
                  },
                };

                await sendFlow({
                  body: message,
                  flow_cta: "Tasks",
                  flow_data: flowData,
                  flow_id: "289845870632326",
                  flow_token: "flows-builder-bfc8f206",
                  recipientPhone,
                });
              } else {
                return await sendTextMessage("There are no pending tasks", recipientPhone);
              }
            } else if (buttonId === "othervehicle") {
              const message =
                " \n\n 🌐 Welcome to APML Vehicle CheckList Form! \n\n🌐 APML वाहन चेकलिस्ट फ़ॉर्म में आपका स्वागत है! ";

              const flowData = {
                screen: "dd_check_list_other",
                data: {
                  partyNames: [
                    {
                      id: "CanonIndiaPvtLtdBhiwandi",
                      title: "Canon India Pvt Ltd, Bhiwandi",
                    },
                    {
                      id: "carestreamBhiwandi",
                      title: "Carestream Health India Pvt Ltd, Bhiwandi",
                    },
                    {
                      id: "henkelBhiwandi",
                      title: "Henkel Adhesive Technologies India Pvt Ltd, Bhiwandi",
                    },
                    {
                      id: "henkelKoperkhairane",
                      title: "Henkel Adhesive Technologies India Pvt Ltd, Koperkhairane",
                    },
                    {
                      id: "tosohIndiaPvtLtd",
                      title: "Tosoh India Pvt Ltd",
                    },
                  ],
                },
              };

              await sendFlow({
                body: message,
                flow_data: flowData,
                flow_cta: "Vehicle Checklist",
                flow_id: "964557614893795",
                flow_token: "flows-builder-1f42ba0c",
                recipientPhone,
              });
            } else if (buttonId.startsWith("gatein")) {
              // console.log(buttonId, "this is bt");/
              console.log({ buttonId });
              // var parts = buttonId.split("@")[1].split("&");
              // let doccid = parts[1];
              const [, vehiclenumber, docId, drivernoo] = buttonId.split("@");
              // const vehiclenumber = buttonId.match(/gatein-(.*?)@/);
              // const drivernoo = parts[2];

              let status = incomingMessage.button_reply.title;
              let gateintimee = finalDateAndTimeFormat;

              let gateinDate = gateintimee.slice(0, 10);
              let rawgateinTime = gateintimee.slice(11, 19);
              let hoursMinutes = rawgateinTime.slice(0, 5);

              session.get(recipientPhone).vehiclenumber = vehiclenumber;
              session.get(recipientPhone).drivernoo = drivernoo;
              session.get(recipientPhone).gateinDate = gateinDate;
              session.get(recipientPhone).gateinTime = hoursMinutes + gateintimee.slice(19, 22);

              const finalgateinTime = hoursMinutes + gateintimee.slice(19, 22);

              // console.log(session, "seesion after gatein");
              let message =
                "After entering the hub gate, when the vehicle is loading, please click on the 'Start Loading' button 🚛🔄\nगेट में पहुंचने के बाद, जब वाहन लोड हो रहा हो, कृपया 'स्टार्ट लोडिंग' बटन पर क्लिक करें! 🚛🔄";
              const listOfButtons = [
                {
                  title: "Start Loading",
                  id: `startloading@${docId}`,
                },
              ];

              await sendSimpleButtons(message, listOfButtons, recipientPhone);
              console.log(docId, "docId");
              const res = await SafetyCheck.updateOne(
                { _id: docId },
                {
                  gateindate: gateinDate,
                  gateintime: finalgateinTime,
                  status: "gateincomplete",
                }
              );
              console.log(res);
            } else if (buttonId.startsWith("startloading")) {
              const [, docId] = buttonId.split("@");
              let startLoading = incomingMessage.button_reply.title;
              let loadingTimee = finalDateAndTimeFormat;
              let loadingDate = loadingTimee.slice(0, 10);
              let rawloadingTime = loadingTimee.slice(11, 19);
              let hoursMinutes = rawloadingTime.slice(0, 5);
              session.get(recipientPhone).loadingTime = hoursMinutes + loadingTimee.slice(19, 22);
              session.get(recipientPhone).loadingDate = loadingDate;

              const finalloadingtime = hoursMinutes + loadingTimee.slice(19, 22);

              session.get(recipientPhone).session = "loadedTruckphoto";

              let message =
                "Please send Total 3 photos  of the loaded truck one by one.🚚\nकृपया भरे गए ट्रक की कुल 3 तस्वीरें एक के बाद एक भेजें। 🚚\n\nFirst Photo\nपहली तस्वीर 📸";

              sendTextMessage(message, recipientPhone);

              console.log({ finalloadingtime });
              console.log(docId, "docId");
              session.get(recipientPhone).docId = docId;
              const res = await SafetyCheck.updateOne(
                { _id: docId },
                {
                  loadingdate: loadingDate,
                  loadingtime: finalloadingtime,
                  status: "startloadingcomplete",
                }
              );
              console.log(res);
              // await sendSimpleButtons(message, listOfButtons, recipientPhone);
            } else if (buttonId.startsWith("endloading")) {
              let endLoading = incomingMessage.button_reply.title;
              let endloadingTimee = finalDateAndTimeFormat;
              let endloadingeDate = endloadingTimee.slice(0, 10);
              let rawendloadingTime = endloadingTimee.slice(11, 19);
              let hoursMinutes = rawendloadingTime.slice(0, 5);
              const [, docId] = buttonId.split("@");

              session.get(recipientPhone).docId = docId;
              session.get(recipientPhone).endloadingeDate = endloadingeDate;
              session.get(recipientPhone).endloadingTime =
                hoursMinutes + endloadingTimee.slice(19, 22);

              const finalendloadingtime = hoursMinutes + endloadingTimee.slice(19, 22);
              session.get(recipientPhone).session = "ewayBill";

              const message =
                "Please send the photo of the E-way bill. 📸\nकृपया ई-वे बिल की तस्वीर भेजें। 📸";
              await sendTextMessage(message, recipientPhone);
              console.log(docId, "send eway bill");
              const res = await SafetyCheck.updateOne(
                { _id: docId },
                {
                  endloadingdate: endloadingeDate,
                  endloadingtime: finalendloadingtime,
                  status: "endloadingcomplete",
                }
              );
              console.log(res);

              // sendTextMessage(message, recipientPhone);
            } else if (buttonId.startsWith("departure")) {
              let deaparture = incomingMessage.button_reply.title;
              let deapartureTimee = finalDateAndTimeFormat;
              let departureDate = deapartureTimee.slice(0, 10);
              let rawdepartureTime = deapartureTimee.slice(11, 19);
              let hoursMinutes = rawdepartureTime.slice(0, 5);

              const [, docId] = buttonId.split("@");

              console.log({ buttonId });
              console.log({ docId });

              session.get(recipientPhone).docId = docId;
              session.get(recipientPhone).departureDate = departureDate;
              session.get(recipientPhone).departureTime =
                hoursMinutes + deapartureTimee.slice(19, 22);
              const departuretime = hoursMinutes + deapartureTimee.slice(19, 22);
              // const docId = session.get(recipientPhone).docId;
              console.log(docId, "docId");
              const checkList = await SafetyCheck.findById(docId, {
                _id: 0,
                __v: 0,
              });

              const obj = {};

              Object.entries(checkList._doc).forEach(([key, value]) => {
                if (value === "yes" || value === "no") {
                  obj[key] = {
                    ...pdfObj[key],
                    check: value,
                  };
                } else if (obj[key.slice(0, -4)]) {
                  obj[key.slice(0, -4)] = {
                    ...obj[key.slice(0, -4)],
                    photo: value,
                  };
                } else {
                  obj[key] = value;
                }
              });

              Object.assign(obj, session.get(recipientPhone));

              session.get(recipientPhone).session = "endd";
              console.log(docId, "docId");
              const res = await SafetyCheck.updateOne(
                { _id: docId },
                {
                  departuredate: departureDate,
                  departuretime: departuretime,
                  status: "departurecomplete",
                }
              );
              console.log(res);
              console.log(docId, "docId");
              const objPDF = SafetyCheck.findOne({ _id: docId });

              console.log(objPDF, "thish is objPDF");

              const message =
                "Thank you your details has been submitted\n धन्यवाद, आपका विवरण सबमिट कर दिया गया है. 🙏";

              await sendTextMessage(message, recipientPhone);

              const templateFilePath = "./lodingsop.html";
              const outputFileName = `${recipientPhone}-lodingsop.pdf`;

              fetchData();

              async function AllData() {
                try {
                  // const docId = "65f29868bfdb4c191ca9ebf1";
                  console.log(docId, "docId");
                  const dbData = await SafetyCheck.find({ _id: docId });
                  return dbData;
                } catch (error) {
                  console.error("Error fetching data from database:", error);
                  return null;
                }
              }

              async function fetchData() {
                const dbArray = await AllData();

                // console.log(dbArray[0])

                if (dbArray && dbArray.length > 0) {
                  const finalObject = dbArray[0];

                  // Check if the party name is "canon india"
                  console.log({ finalObject });
                  const isCanonIndia = finalObject.partyname === "CanonIndiaPvtLtdBhiwandi";

                  console.log({ isCanonIndia });

                  // Generate the PDF and upload it to the bucket
                  console.log("Creating PDF");
                  const renderedTemplate = nunjucks.render(templateFilePath, finalObject._doc);
                  await createPdf(renderedTemplate, outputFileName);

                  const uploadResult = await uploadFileToGoogleBucket(outputFileName);

                  console.log({ uploadResult });

                  if (uploadResult) {
                    if (isCanonIndia) {
                      const partyNumbers = [
                        // "919673666807",
                        // "919892735892",
                        // "919920337350",
                        // "919821481356",
                        // "919820544415",
                        // "919999789215",
                        "919730945316",
                      ];

                      for (const number of partyNumbers) {
                        const templateMessage = {
                          messaging_product: "whatsapp",
                          recipient_type: "individual",
                          to: number,
                          type: "template",
                          template: {
                            name: "daily_list",
                            language: {
                              code: "en_US",
                            },
                            components: [
                              {
                                type: "header",
                                parameters: [
                                  {
                                    type: "document",
                                    document: {
                                      link: uploadResult,
                                    },
                                  },
                                ],
                              },
                              {
                                type: "body",
                                parameters: [
                                  {
                                    type: "text",
                                    text: finalObject.vehicleNumber,
                                  },
                                ],
                              },
                            ],
                          },
                        };

                        await WHATSAPP_API.post("/messages", templateMessage);
                      }
                    }
                  }

                  await Whatsapp.sendDocument({
                    recipientPhone,
                    file_path: `./${outputFileName}`,
                    caption: "loading",
                  });
                } else {
                  console.log("No data found");
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.log(err);
    }
  } catch (e) {}
});

module.exports = router;

function isMessage(message) {
  return message?.isMessage;
}

function parseMessage(message) {
  return {
    incomingMessage: message,
    recipientName: message.from.name,
    recipientPhone: Number(message.from.phone),
    typeOfMsg: message.type,
    message_id: message.message_id,
    timestamp: Number(`${message.timestamp}000`) + 1e4,
  };
}

function isMessageRecent(timestamp) {
  const currentTimestamp = new Date().getTime();

  return timestamp > currentTimestamp;
}

async function sendRadioButtons(message, listOfSections, recipientPhone) {
  await Whatsapp.sendRadioButtons({
    recipientPhone,
    headerText: "APML",
    bodyText: message,
    footerText: "© 2024 APML",
    listOfSections,
  });
}

async function sendSimpleButtons(message, listOfButtons, recipientPhone) {
  try {
    await Whatsapp.sendSimpleButtons({
      message,
      recipientPhone,
      listOfButtons,
    });
  } catch (error) {
    console.log(error, "error");
  }
}

async function sendTextMessage(message, recipientPhone) {
  try {
    await Whatsapp.sendText({
      message,
      recipientPhone,
    });
  } catch (error) {
    console.log(error, "error");
  }
}

async function sendFlow({
  header,
  body,
  footer,
  flow_id,
  flow_cta,
  flow_token,
  flow_data,
  recipientPhone,
}) {
  try {
    const flowObj = createFlow(
      header,
      body,
      footer,
      flow_id,
      flow_cta,
      flow_token,
      flow_data,
      recipientPhone
    );
    console.log(JSON.stringify(flowObj));
    await WHATSAPP_API.post("/messages", flowObj);
  } catch (err) {
    console.error(err.response);
  }
}
async function sendTemplateMessage(recipientPhone) {
  const messageData = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipientPhone,
    type: "template",
    template: {
      name: "daily_active_session",
      language: {
        code: "en",
      },
      components: [
        {
          type: "button",
          sub_type: "quick_reply",
          index: "0",
          parameters: [
            {
              type: "payload",
              payload: "activateSession",
            },
          ],
        },
      ],
    },
  };
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v19.0/${process.env.Meta_WA_SenderPhoneNumberId}/messages`,
      messageData,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.Meta_WA_accessToken}`,
        },
      }
    );
    console.log("Template message sent:", response.data);
  } catch (error) {
    console.error("Error sending template message:", error.response.data);
  }
}

function createFlow(
  header,
  body,
  footer,
  flow_id,
  flow_cta,
  flow_token,
  flow_data,
  recipientPhone
) {
  const flowObj = {
    messaging_product: "whatsapp",
    to: recipientPhone,
    type: "interactive",
    interactive: {
      type: "flow",
      header: {
        type: "text",
        text: header ?? "APML",
      },
      body: {
        text: body ?? "Body",
      },
      footer: {
        text: footer ?? "©Agarwal Packers & Movers Ltd",
      },
      action: {
        name: "flow",
        parameters: {
          flow_message_version: "3",
          flow_token,
          flow_id,
          flow_cta,
          flow_action: "data_exchange",
        },
      },
    },
  };

  if (flow_data) {
    if (!flow_data.screen) {
      throw new Error("Screen Name is required when sending custom flow data");
    }

    flowObj.interactive.action.parameters["flow_action_payload"] = {
      screen: flow_data.screen,
      data: flow_data.data,
    };

    delete flowObj.interactive.action.parameters.flow_action;
  }

  return flowObj;
}

async function getMediaUrl(mediaId) {
  try {
    const metaImageUrl = `https://graph.facebook.com/v16.0/${mediaId}`;
    const imageUrlConfig = await axiosConfig(metaImageUrl, "get");

    const { url } = await axiosRequest(imageUrlConfig);
    return url;
  } catch (e) {
    return "";
  }
}

async function axiosConfig(url, method, data = "") {
  return {
    method,
    maxBodyLength: Infinity,
    url,
    headers: {
      Authorization: `Bearer ${process.env.Meta_WA_accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: data,
  };
}

async function axiosRequest(config) {
  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.log(error.message);
  }
}

async function downloadAndSave(mediaUrl, fileName) {
  const downloadImageConfig = await axiosConfig(mediaUrl, "get");
  const response = await axios({
    ...downloadImageConfig,
    responseType: "stream",
  });

  const fileStream = fs.createWriteStream(fileName);

  response.data.pipe(fileStream);

  return await new Promise((resolve, reject) => {
    fileStream.on("finish", () => resolve(true));
    fileStream.on("error", () => reject(false));
  });
}

async function createPDFAsync(renderedTemplate, outputFileName, orientation) {
  const pdfOptions = {
    format: "A3",
    type: "pdf",
    // border: {
    //   top: "1cm",
    //   bottom: "1cm"
    // },
    orientation,
  };

  return await new Promise((resolve, reject) => {
    const p = pdf.create(renderedTemplate, pdfOptions);

    p.toFile(outputFileName, (err) => {
      if (err) {
        console.error(err);
        reject(err);
      } else {
        resolve(true);
      }
    });
  });
}

const storage = new Storage({
  keyFilename: `./google-bucket.json`,
});

const bucketName = "attendance-bucket-autowhat";
const bucket = storage.bucket(bucketName);

async function uploadToBucket(url, fileName) {
  const downloadImageConfig = await axiosConfig(url, "get");
  const response = await axios({
    ...downloadImageConfig,
    responseType: "stream",
  });

  const blob = bucket.file(fileName);
  const blobStream = blob.createWriteStream({
    resumable: false,
  });

  return new Promise((resolve, reject) => {
    response.data.pipe(blobStream);

    blobStream.on("error", (error) => {
      reject({
        status: "failed",
        message: "Failed to upload",
        error: error.message,
      });
    });

    blobStream.on("finish", async () => {
      try {
        const [url] = await blob.getSignedUrl({
          action: "read",
          expires: "01-01-2030",
        });
        resolve({
          status: "success",
          message: "Uploaded the file successfully",
          url,
        });
      } catch (error) {
        reject({
          status: "failed",
          message: `Uploaded the file successfully: ${fileName}, but public access is denied!`,
          error: error.message,
        });
      }
    });
  });
}

function createSessionObj(obj, pdfObj) {
  const matchedKeys = {};

  for (const key in obj) {
    if (pdfObj.hasOwnProperty(key)) {
      matchedKeys[key] = {
        ...pdfObj[key],
        check: obj[key],
      };
    } else {
    }
  }

  return matchedKeys;
}

function convertObject(obj) {
  const convertedObj = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (Object.hasOwn(obj[key], "link")) {
        convertedObj[`${key}Link`] = obj[key].link;
      }

      convertedObj[key] = obj[key].check;
    }
  }

  return convertedObj;
}

function createPdfObj(obj) {
  const convertedObj = {
    checks: [],
  };

  for (const key in obj) {
    // console.log(key);
    if (obj.hasOwnProperty(key)) {
      if (typeof obj[key] === "object") {
        convertedObj.checks.push(obj[key]);
      } else {
        convertedObj[key] = obj[key];
      }
    }
  }

  return convertedObj;
}

async function createPdf(html, fileName) {
  const page = await browser.newPage();

  await page.setContent(html);

  const pdfOptions = {
    path: `${__dirname}/${fileName}`,
    format: "A3",
    printBackground: true,
  };

  await page.pdf(pdfOptions);
}

async function uploadFileToGoogleBucket(fileName) {
  try {
    const [file] = await bucket.upload(`./${fileName}`, {
      destination: `dd/${fileName}`,
    });

    if (file) {
      const [url] = await file.getSignedUrl({
        action: "read",
        expires: "01-01-2030",
      });

      console.log(`File ${fileName} uploaded to ${bucketName}.`);
      return url;
    } else {
      throw new Error(`Failed to upload file ${fileName}`);
    }
  } catch (err) {
    console.error(`Error uploading file ${fileName}:`, err);
    throw err;
  }
}

