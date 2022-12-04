//WorkAround's website to upload schedules uploaded from workday.

//Accomplishes goal by first having user upload xlsx file, then the server will download it and parse through it and finally
//send it to our dataservice. TODO: include dataservice endpoint
const express = require("express");
const upload = require("express-fileupload");
const path = require("path");
const XLSX = require("xlsx");
const axios = require('axios');


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

//takes in [starttime, am/pm, endtime, am/pm] and returns [militarystart, militaryend]
function getMilitary(startTime, startMeridian, endTime, endMeridian){
  var military = [startTime, endTime];
  if (startMeridian=='PM' && startTime.substring(0,2) != '12'){
    if(startTime[1] ==':'){var militStart = parseInt(startTime[0])+12;}
    else{var militStart = 10+ parseInt(startTime[1])+12;}
    military[0] = militStart.toString()+':'+startTime[2]+startTime[3];}
  if (endMeridian=='PM' && endTime.substring(0,2) != '12'){
    if(endTime[1] ==':'){var militEnd = parseInt(endTime[0])+12;}
    else{var militEnd = 10+ parseInt(endTime[1])+12;}
    military[1] = militEnd.toString()+':'+endTime[2]+endTime[3];}
  return military;
}

/** (works with deleted first row)
 * ParseXLSX function takes WorkDay Schedule and turns
 * data into an array of arrays where:
 *          - info[0] is attributes
 *          - info[1][0] is 1st attr of event1
 *          - info[2] is 2nd event
 *          - ...
 */
 async function parsexlsx(filename) {
  await new Promise(r => setTimeout(r, 5000));
  const workbook = XLSX.readFile(filename, { sheetStubs: false }); //Read the Excel File data
  const ws = workbook.Sheets[workbook.SheetNames[0]]; //get first sheet in xlsx page
  var info = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    blankrows: false,
    skipHeader: true,
  }); //turns the first sheet into a json

  const nameSchedRegex = '(.*) -.*-.*-.*-.*-.*- (.*)'; //gets users name and semesterYear from first line of first class
  var nameSched = [...info[3][0].matchAll(nameSchedRegex)];
  var student = nameSched[0][1];
  var semesterYear = nameSched[0][2];
  console.log(student);
  console.log(semesterYear);
  var studentIDNum = '2012298'; //IMPORTANT FOR TESTING: change this number, its a unique id but is constant in program
  var schedNum = semesterYear.length-8;//since Fall and Spring have dif length, this tries to get a number to tell which schedule is which for unique ID purposes
  var schedID = schedNum.toString() +semesterYear.substring(2,4)+studentIDNum[3];//attempting to make unique id that takes into account schedule and user (but mushing them is too big a number apparently)
  // //post student to make sure they exist
  axios.post('https://workaroundservice.herokuapp.com/',{id: studentIDNum, name: student})
           .catch((error) => console.error("couldn't post student"));
  //delete schedule if it exists
  axios.delete('https://workaroundservice.herokuapp.com/'+student+'/'+semesterYear)
          .catch((error) => console.error("couldn't delete schedule"));
  //post schedule
  await new Promise(r => setTimeout(r, 2000));
  axios.post('https://workaroundservice.herokuapp.com/'+student, 
    {id: parseInt(schedID), semesterYear:semesterYear, userID: studentIDNum})
    .catch((error) => console.error("couldn't make schedule"));
  const courseRegex = '([A-Z]+ [0-9]+)'; 
  const dayDesStartEndLocRegex = '([A-Z]+) \\| ([0-9]+:[0-9][0-9]) ([AP]M) - ([0-9]+:[0-9][0-9]) ([AP]M) \\| (.*) - .*'; 
  await new Promise(r => setTimeout(r, 2000));
  var counter =parseInt(studentIDNum.substring(4));//for some reason the thing really didn't like me passing x for eventID, the errors said that eventID wasn't unique (despite it, in fact, being unique)
  for(var x=2; x<info.length;x++){
    var values = [...info[x][7].matchAll(dayDesStartEndLocRegex)][0]; //[matchedString, dayDesignation, starttime, AM/PM, endtime, AM/PM, location]
    var courseName = [...info[x][1].matchAll(courseRegex)][0];// [courseName]
    var times = getMilitary(values[2],values[3],values[4],values[5]); //[startTime, endTime]
    //instructor is in info[x][9]
    counter+= 100;
    axios.post('https://workaroundservice.herokuapp.com/'+student+'/'+semesterYear,
    {
      eventID: parseInt(counter),
      name: courseName[0],
      startTime: times[0],
      endTime: times[1],
      dayDesignation: values[1],
      location: values[6],
      eventLead: info[x][9],
      scheduleID: parseInt(schedID)
    })
      .catch((error) => console.error("failed to post event"));
}
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
  arr.forEach( (item) => parsexlsx(item.name));
});

// set port from environment variable, or 8080
const PORT = 8080;

app.listen(PORT, () => console.log(`listening on port ${PORT}`));
