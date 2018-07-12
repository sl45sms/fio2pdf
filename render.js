var express = require('express');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var config = require('./config.json');
var escapeJSON = require('escape-json-node');
var fs = require('fs');
const uuidv1 = require('uuid/v1');

const RenderPDF = require('chrome-headless-render-pdf');

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
    <link rel='stylesheet' href='../node_modules/bootstrap/dist/css/bootstrap.min.css'>
    <link rel='stylesheet' href='../node_modules/formiojs/dist/formio.full.min.css'>
    <script src='../node_modules/formiojs/dist/formio.full.min.js'></script>
    <script type='text/javascript'>
             window.onload = function() {
             var form_object=JSON.parse(\`--FORM--\`.replace(/\\r?\\n|\\r/g, ''));

             var submission_object=JSON.parse(\`--SUBMISSION--\`.replace(/\\r?\\n|\\r/g, ''));

                console.log(form_object,submission_object);

                 Formio.createForm(document.getElementById('formio'),form_object.form,{ readOnly: true }).then(function(form) {
                          form.submission =submission_object;
                              }
                       );
                   }; 
    </script>
</head>
<body>
<div id='formio'></div>
</body>
</html>
`;

function render(sid,fid,res,next){
// First authenticate.
   formio.authenticate(config.formio_admin_email, config.formio_admin_password,"/user/login").then(function() {
      // Create a new form instance.
      var form = new Form(config.formio_protocol+'://'+config.formio_host+':'+config.formio_port+'/form/'+fid);
        
      form.load().then(function(form_object){
             form_object.form.display="form"; //alway ovveride in case of wizard 
             form.loadSubmission(sid).then(function(submission){ 
                       //Write temp file
                       var JF = escapeJSON(JSON.stringify(form_object).replace(/\r?\n|\r/g, " "));
                       var JS = escapeJSON(JSON.stringify(submission).replace(/\r?\n|\r/g, " ")); 
                       template = template.replace('--FORM--',JF);
                       template = template.replace('--SUBMISSION--',JS);
                       var fn=uuidv1()+'.html';
                       fs.writeFile("/tmp/"+fn, template, function(err) {
                           if(err) {
                                res.setHeader('Content-Type', 'application/json');
                                res.send(err);
                                    }
                                     
                                    RenderPDF.generatePdfBuffer('file:///tmp/'+fn,{chromeOptions: ['--no-sandbox']}).then((pdfBuffer) => {                                         
                                      res.setHeader('Content-Type', 'application/pdf'); 
                                      fs.unlinkSync("/tmp/"+fn);
                                      res.send(pdfBuffer);
                                        });
                                     });          
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

app.post('/', function(req, res, next) {

  render(req.body.submission._id,req.body.submission.form,res,next);

});

console.log('Listening to port ' + config.port);
app.listen(config.port);

