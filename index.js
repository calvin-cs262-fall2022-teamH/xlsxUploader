//WorkAround's website to upload schedules uploaded from workday.

//Accomplishes goal by first having user upload xlsx file, then the server will download it and parse through it and finally
//send it to our dataservice. TODO: include dataservice endpoint
const express = require("express");
const upload = require("express-fileupload");
const path = require("path");
const XLSX = require("xlsx");

//app setup
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false })); // this is to handle URL encoded data
app.use(upload());
app.use(express.static(path.join(__dirname, "public"))); // enable static files pointing to the folder "public

//sending index.html to user's browser
app.get("", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

/** (works with deleted first line)
 * ParseXLSX function takes WorkDay Schedule and turns
 * data into an array of arrays where:
 *          - info[0] is attributes
 *          - info[1][0] is 1st attr of event1
 *          - info[2] is 2nd event
 *          - ...
 */
function parsexlsx(filename) {
  const workbook = XLSX.readFile(filename); //Read the Excel File data
  const ws = workbook.Sheets[workbook.SheetNames[0]]; //get first sheet in xlsx page
  var info = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false }); //turns the first sheet into a json
  console.log(info); //log info to test
}

// receives file from user's browser and downloads it to home folder
app.post("/upload", function (request, response) {
  var files = new Array();
  if (request.files) {
    var arr;
    if (Array.isArray(request.files.filesfld)) {
      arr = request.files.filesfld;
    } else {
      arr = new Array(1);
      arr[0] = request.files.filesfld;
    }
    for (var i = 0; i < arr.length; i++) {
      var file = arr[i];
      files[i] = "/" + file.name;
      file.mv("." + files[i], function (err) {
        if (err) {
          //   console.log(err); //throws error if something goes wrong
        }
      });
    }
  }
  setTimeout(function () {
    response.json(files);
  }, 1000); // give the server a second to write the files
  //TODO: ADD A FUNC TO SLEEP FOR SOME TIME SO THAT XLSX CAN DOWNLOAD. Currently, the program only works when file is already downloaded
  arr.forEach((item) => parsexlsx(item.name));
});

// set port from environment variable, or 8080
const PORT = 8080;

app.listen(PORT, () => console.log(`listening on port ${PORT}`));
