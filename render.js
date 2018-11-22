var express = require('express');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var escapeJSON = require('escape-json-node');
var fs = require('fs');
var utils = require('formiojs/utils');
const http = require('http');
const https = require('https');

const uuidv1 = require('uuid/v1');
const RenderPDF = require('chrome-headless-render-pdf');

if (fs.existsSync('.config.json')) {
 var config = require('./config.json');
} else
{
var config = {
"port": process.env.PORT || "6112",
"formio_protocol":process.env.FORMIO_PROTOCOL || "http",
"formio_host": process.env.FORMIO_HOST || "formio-api",
"formio_port": process.env.FORMIO_PORT || "3001",
"formio_admin_email": process.env.FORMIO_ADMIN_EMAIL,
"formio_admin_password": process.env.FORMIO_ADMIN_PASSWORD
}
}

var formio = require('formio-service')(
{
formio: config.formio_protocol+'://'+config.formio_host+':'+config.formio_port,
api: config.formio_protocol+'://'+config.formio_host+':'+config.formio_port
}
);

var Form = formio.Form;

var template=`
<html>
<head>
    <link rel='stylesheet' href='/app/node_modules/bootstrap/dist/css/bootstrap.min.css'>
    <link rel='stylesheet' href='/app/node_modules/formiojs/dist/formio.full.min.css'>
    <style>
@media print{		
	@page {
         size: A4;
       }		
	
   .btn {
                display:none!important;
        }
   
    #formio .no-header ul.list-group-striped {
        display:none;
    }
   
   #formio .formio-component-datetime .flatpickr-input {
       direction:rtl!important;
   }

 #formio > div >div.card {
	      margin-top:10px;
          page-break-before: avoid;
          page-break-after: always;
  }
}
    </style>
    <script src='/app/node_modules/formiojs/dist/formio.full.min.js'></script>
    <script type='text/javascript'>
             window.onload = function() {
                var token="--TOKEN--"
                Formio.clearCache();
                Formio.setBaseUrl('http://formio-api:3001');
                Formio.setProjectUrl('http://formio-api:3001');
                Formio.setToken(token);                 
                var MyForm= new Formio("/form/--FORM--/submission/--SUBMISSION--");
				MyForm.loadForm().then(function(rform) {
                 rform.display="form";
                 Formio.createForm(document.getElementById('formio'),rform,
                 { readOnly: true, viewAsHtml: true }).then(function(form) {
                         MyForm.loadSubmission().then(function(submission) {
                           form.submission=submission;
                           });  
                           });
                });                       
              };
    </script>
</head>
<body>
<div id='formio'></div>
</body>
</html>
`;



function render(sid,fid,res,type){


// First authenticate.
   formio.authenticate(config.formio_admin_email, config.formio_admin_password,"/user/login").then(function() {
      var jwtToken=formio.currentUser.token;

                      console.log("render form "+fid+" submission "+sid);
                       
                       var rtemplate = template.slice(0);
                       rtemplate = rtemplate.replace('--TOKEN--',jwtToken); 
                       rtemplate = rtemplate.replace('--FORM--',fid);
                       rtemplate = rtemplate.replace('--SUBMISSION--',sid);
                       

                       var fn=uuidv1()+'.html';
                       fs.writeFile("/tmp/"+fn, rtemplate, function(err) {
                           if(err) {
                                res.setHeader('Content-Type', 'application/json');
                                res.send(err);
                                    }
                                     
                                    RenderPDF.generatePdfBuffer('file:///tmp/'+fn,{chromeOptions: ['--no-sandbox','--aggressive-cache-discard','--disable-application-cache','--disable-notifications','--disable-remote-fonts','--disable-reading-from-canvas','--disable-reading-from-canvas','--disable-reading-from-canvas','--disable-voice-input','--enable-aggressive-domstorage-flushing']}).then((pdfBuffer) => {                                         
                                      fs.unlinkSync("/tmp/"+fn);
                                      if (type=="pdf"){
                                        res.setHeader('Content-Type', 'application/pdf'); 
                                        res.send(pdfBuffer);
                                        } else
                                        {
                                         res.setHeader('Content-Type', 'application/json');
                                         res.send('{"file":"' + pdfBuffer.toString('base64') +'"}');
                                        }                                      
                                     
                                               });
                                     });  

     });
}

// Create our application.
var app = express();

// Add Middleware necessary for REST API's
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(methodOverride('X-HTTP-Method-Override'));

// Add headers
app.use(function (req, res, next) {
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');
    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', false);
    // Pass to next layer of middleware
    next();
});

app.get('/',function(req, res) {
  render(req.query.submissionid,req.query.formid,res,"pdf");
});

app.post('/', function(req, res) {
  render(req.body.submission._id,req.body.submission.form,res,"pdf");
});

app.post('/base64', function(req, res) {

  render(req.body.submission._id,req.body.submission.form,res,"base64");

});


console.log('Listening to port ' + config.port);
app.listen(config.port)
