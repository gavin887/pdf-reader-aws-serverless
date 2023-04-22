const fs = require("fs")
const path = require("path")
const axios = require("axios");
const Koa = require("koa")
const Router = require("@koa/router")
const bodyParser = require('koa-bodyparser');
const crc32 = require('crc32');
const winston = require('winston');
const {format: wformat } = winston;
const _ = require("lodash");
const dataStore = require("./lib/dataStore.js");
const PDF2CSV = require("./lib/pdf2csv");

const app = new Koa();
const router = Router();

const logger = winston.createLogger({
    transports: [
        new winston.transports.Console({
            format: wformat.combine( wformat.colorize(), wformat.simple() ),
            level: 'debug'
        }),
    ]
})

app.use(bodyParser());


/**
 * Upload entrance
 */
router.get('/new_issue', (ctx, next) => {
    ctx.type = 'html'
    ctx.body = `<!DOCTYPE HTML><html><head><meta charset="utf-8"><title>PDF file upload</title><style rel="text/css">.demo{width:320px;margin:200px auto}form{width:320px;padding:20px}.form-item{height:32px;line-height:32px}.form-operation{height:32px;line-height:32px;text-align:center}.form-item label{display:inline-block;width:60px;text-align:right}</style></head><body><div id="main"><div class="demo"><form action="new_issue"method="post"enctype="application/x-www-form-urlencoded"><div class="form-item"><label for="url">url:</label><span><input id="url"name="url"type="text"value=""/></span></div><div class="form-operation"><button type="submit">Submit</button></div></form></div></div></body></html>`;
    return next();
});

/**
 * Upload, parse and store in MySQL
 */
router.post('/new_issue', async (ctx, next) => {

    await next();

    let url = ctx.request.body.url;
    if (! url || url.indexOf('.com/file') < 0) {
        ctx.body = {code: 400, message: 'invalid {url} param!'};
        return;
    }

    logger.debug("Google drive url :>> " + url);

    let fileId = /\/([0-9a-zA-Z]{26,40})/.exec(url)[1];
    let fileDownloadURL = `https://drive.google.com/uc?id=${fileId}&export=download`;
    logger.debug("Download url :>> " + fileDownloadURL);

    let fileArrayBuffer = await axios.get(fileDownloadURL, { responseType: "blob" }).then(response => response.data);

    let fileSign = crc32(Buffer.from(fileArrayBuffer));
    logger.debug("File signature :>> " + fileSign);


    let issueCount = await dataStore.IssueHasExists(fileSign);
    if (issueCount > 0) {
        ctx.body = {code: 0, message: 'Issue has exists!', data: { signature: fileSign, length: fileArrayBuffer.byteLength}};
        return ctx;
    } else {
        ctx.body = {code: 0, message: 'ok', data: { signature: fileSign, length: fileArrayBuffer.byteLength}};
    }


    let convertor = new PDF2CSV;
    let casesOnPage = await convertor.convert(fileArrayBuffer);
    logger.debug("fetch items :>> "+ casesOnPage.length);

    let pageNumbers = Object.keys(casesOnPage);


    let firstPage = casesOnPage[ pageNumbers[0] ];

    //  save issues in async
    let issueDate = firstPage[0].issue;
    dataStore.createIssue(fileSign, url, issueDate);

    let allCasesInfo = [];
    pageNumbers.forEach((item) => {
        allCasesInfo = _.concat(
            allCasesInfo,
            _.map(casesOnPage[item], i => {
                i.issueDate = issueDate;
                i.fileSign = fileSign;
                return i;
            })
        );
    });

    //  save cases in async
    dataStore.bulkCreateIssues(allCasesInfo);
});

/**
 * get issue list
 */
router.get("/issues", async (ctx, next) => {
    await next();
    let date = ctx.request.query.date;
    ctx.body = {code: 0, message: 'ok', data: await dataStore.getIssues(date)};
});

/**
 * cases list
 */
router.get("/cases", async (ctx, next) => {
    await next();
    let params = ctx.request.query;
    ctx.body = {code: 0, message: 'ok', data: await dataStore.getCases(params)};
});


app.use(router.routes());

module.exports = app;