'use strict';

const express = require('express');
const upload = require('multer')();
const fs = require('fs');
const mustache = require('mustache');
const path = require('path');
const { URL } = require('url');

const bodyParser = require('body-parser');

const STATIC_DIR = 'statics';
const TEMPLATES_DIR = 'templates';

const OK = 200;
const CREATED = 201;
const BAD_REQUEST = 400;
const NOT_FOUND = 404;
const CONFLICT = 409;
const SERVER_ERROR = 500;

function serve(port, base, webServiceController) {
  const app = express();
  
  app.locals.port = port;
  app.locals.base = base;
  app.locals.webServiceController = webServiceController;

  process.chdir(__dirname);
  app.use(base, express.static(__dirname));
  app.use(bodyParser.urlencoded({
    extended: true
  }));
  app.use(bodyParser.json());

  setupTemplates(app, TEMPLATES_DIR);
  setupRoutes(app);

  app.listen(port, function() {
    console.log(`GNC Web Server listening on port ${port}`);
  });
}

module.exports = serve;

const INDEX_PAGE = '/';
const MODEL_PAGE = '/home/model';

function setupRoutes(app) {

  const BASE = app.locals.base;

  app.get(INDEX_PAGE, redirectHome(app));

  app.get(BASE, toHomePage(app));
  app.get(MODEL_PAGE, toModelPage(app));

  app.get(`/temp/:sensorId`, getTemp(app));

  app.use(doErrors());
}

function redirectHome(app) {
  return errorWrap(async function(req, res) {
    try {
      res.redirect(app.locals.base);
    }
    catch (err) {
      console.error(err);
    }
  });
}

function toHomePage(app) {
  return errorWrap(async function(req, res) {
    try {
      res.sendFile(path.join(__dirname+'/statics/index.html'));
    }
    catch (err) {
      console.error(err);
    }
  });
}

function toModelPage(app) {
  return errorWrap(async function(req, res) {
    try {
      res.sendFile(path.join(__dirname+'/statics/model.html'));
    }
    catch (err) {
      console.error(err);
    }
  });
}

function getTemp(app) {

  return errorWrap(async function(req, res) {
    try {

      const sensorId = req.params.sensorId;
      const sensorValue = await app.locals.webServiceController.getTemp(sensorId);

      res.send(`${sensorValue}`);
    }
    catch (err) {
      console.error(err);
      console.log("ERROR in pc_server");
    }
  });
}

function generateCustomHTML(lines, terms) {
  let termArray = terms.split(" ");
  let retArray = [];

  for (let line of lines) {
    for (let term of termArray) {
      line = line.toLowerCase().replace(term.toLowerCase(), getHTMLString(term.toLowerCase()));
    }
    retArray.push(line);
  }
  return retArray;
}

function getHTMLString(term) {
  return `<span class=\"search-term\"> ${term} </span>`
}

function getNonEmptyValues(values) {
  const out = {};
  Object.keys(values).forEach(function(k) {
    const v = values[k];
    if (v && v.trim().length > 0) out[k] = v.trim();
  });
  return out;
}

function relativeUrl(req, path='', queryParams={}, hash='') {
  const url = new URL('http://dummy.com');
  url.protocol = req.protocol;
  url.hostname = req.hostname;
  url.port = req.socket.address().port;
  url.pathname = req.originalUrl.replace(/(\?.*)?$/, '');
  if (path.startsWith('/')) {
    url.pathname = path;
  }
  else if (path) {
    url.pathname += `/${path}`;
  }
  url.search = '';
  Object.entries(queryParams).forEach(([k, v]) => {
    url.searchParams.set(k, v);
  });
  url.hash = hash;
  return url.toString();
}

function doMustache(app, templateId, view) {
  const templates = { footer: app.templates.footer };
  return mustache.render(app.templates[templateId], view, templates);
}

function setupTemplates(app, dir) {
  app.templates = {};
  for (let fname of fs.readdirSync(dir)) {
    const m = fname.match(/^([\w\-]+)\.ms$/);
    if (!m) continue;
    try {
      app.templates[m[1]] =
	String(fs.readFileSync(`${TEMPLATES_DIR}/${fname}`));
    }
    catch (e) {
      console.error(`cannot read ${fname}: ${e}`);
      process.exit(1);
    }
  }
}

function errorWrap(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    }
    catch (err) {
      next(err);
    }
  };
}

function getError (err) {
  let errorObj;

  if (err.isDomain) {
    let statusType;
    switch (err.errorCode) {
      case "NOT_FOUND" :
        statusType = NOT_FOUND;
        break;
      case "EXISTS" :
        statusType = CONFLICT;
        break;
      default:
        statusType = BAD_REQUEST;
    }

    errorObj = {
      status: statusType,
      code: err.errorCode,
      message: err.message
    }
  } else {
    errorObj = {
      status: SERVER_ERROR,
      code: `INTERNAL`,
      message: err.toString(),
    }
  }

  return errorObj;
}

function doErrors(app) {
  return async function(err, req, res, next) {

    if (err instanceof SyntaxError) {
      const error = {error: "Invalid JSON", tips: "Check if body has correct JSON syntax" }
      res.statusCode = BAD_REQUEST;
      res.json(error);
    } else {
      res.status(SERVER_ERROR);
      res.json({ code: 'SERVER_ERROR', message: err.message });
      console.error(err);
    }
  };
}
