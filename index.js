const express = require("express");
const upload = require("express-fileupload");
const path = require("path");
const XLSX = require('xlsx');

const app = express();


// middleware
app.use(express.json());
app.use(express.urlencoded( { extended: false } )); // this is to handle URL encoded data
app.use(upload());



// enable static files pointing to the folder "public"
app.use(express.static(path.join(__dirname, "public")));

app.get('', (req, res) => {
    res.sendFile(__dirname + '/index.html')
})

function ec(r, c){
    return XLSX.utils.encode_cell({r:r,c:c});
}

function delete_row(ws, row_index){
    var variable = XLSX.utils.decode_range(ws["!ref"])
    for(var R = row_index; R < variable.e.r; ++R){
        for(var C = variable.s.c; C <= variable.e.c; ++C){
            ws[ec(R,C)] = ws[ec(R+1,C)];
        }
    }
    variable.e.r--
    ws['!ref'] = XLSX.utils.encode_range(variable.s, variable.e);
}
function parsexlsx(filename) {
    //Read the Excel File data 
    const workbook = XLSX.readFile(filename)
    const ws = workbook.Sheets[workbook.SheetNames[0]];
    ////
    var cell = XLSX.utils.decode_cell('A3');
    console.log(ws[cell]);
    var variable = XLSX.utils.decode_range(ws["!ref"]);
    console.log(variable);
    for(var R = 1; R < variable.e.r; ++R){
        for(var C = variable.s.c; C <= variable.e.c; ++C){
            ws[ec(R,C)] = ws[ec(R+1,C)];
        }
    }
    variable.e.r--
    ws['!ref'] = XLSX.utils.encode_range(variable.s, variable.e);
    ////
    var info = XLSX.utils.sheet_to_json(ws);
    console.log(info);
    console.log(XLSX.utils.sheet_to_row_object_array(ws)[0]);
    console.log(XLSX.utils.sheet_to_txt(ws));
    console.log(XLSX.utils.sheet_to_txt(ws));
}

// HTTP POST
// upload image files to server
app.post("/upload", function(request, response) {
    var files = new Array();
    if(request.files) {
        var arr;
        if(Array.isArray(request.files.filesfld)) {
            arr = request.files.filesfld;
        }
        else {
            arr = new Array(1);
            arr[0] = request.files.filesfld;
        }
        for(var i = 0; i < arr.length; i++) {
            var file = arr[i];
                files[i] = "/" + file.name;
                file.mv("." + files[i], function (err) {
                    if(err) {
                        console.log(err);
                    }
                });
        }
    }
    // give the server a second to write the files
    setTimeout(function(){response.json(files);}, 1000);
    //!!!TODO ADD A FUNC TO SLEEP FOR SOME TIME SO THAT XLSX CAN DOWNLOAD
    arr.forEach(item => parsexlsx(item.name));
});

// set port from environment variable, or 8080
const PORT =  8080;

app.listen(PORT, () => console.log(`listening on port ${PORT}`));
