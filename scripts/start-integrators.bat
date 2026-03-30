@echo off
echo Starting UNIGIS Integrators...

echo Starting Swagger Integrator on http://localhost:50156...
start /B "uniSwagger" cmd /c "cd /d %~dp0..\integrators\uni-swagger && node server.js"

echo Starting SOAP Integrator on http://localhost:50157...
start /B "uniSOAP" cmd /c "cd /d %~dp0..\integrators\uni-soap && node server.js"

echo Integrators are running in the background.
