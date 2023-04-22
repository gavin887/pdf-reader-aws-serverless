const PDFjsLib = require("pdfjs-dist/webpack");
const PdfjsWorker = require("pdfjs-dist/build/pdf.worker");
PDFjsLib.GlobalWorkerOptions.workerPort = PdfjsWorker;

class PDF2CSV {

    /**
     * @param file_buffer
     * @returns {Promise<unknown>}
     */
    async convert(file_buffer) {
        let pagesInfo = await this.getPageInfo(file_buffer);
        return this.parsePDFJson(pagesInfo);
    }

    parsePDFJson(pages) {

        let currPage = 0;
        let currIssue = "";
        let currCourt = {number: "", type: ""};
        let currSecretaria = "";
        let currCaseItem = {};
        let caseItems = [];
        let hitDeLoCivil = false;
        let totalCourtInfo = '';

        let mexicanos_month = ['', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

        const compareArrays = (a, b) => {
            return a.toString() === b.toString();
        };

        for (let i = 0; i < pages.length; i++) {

            let page = pages[i];

            for (let j = 0; j < page.length; j++) {
                let text = page[j];
                let textContent = text.str;
                let textStyle = text.transform;

                //  court info
                if (/^g_\w+_f1$/.test(text.fontName) === true && compareArrays(textStyle.slice(0, 4), [10.45, 0, 0, 11])) {

                    //  skip sala
                    let salaFlag = textContent.indexOf('SALA CIVIL') > 0 || textContent.indexOf('SALA FAMILIAR') > 0;
                    if (salaFlag) continue;

                    //  start parse
                    let startFlag = (textContent.indexOf('DE LO CIVIL') > 0 || textContent.indexOf('DE LO FAMILIAR') > 0);

                    if (hitDeLoCivil === false && startFlag) {
                        hitDeLoCivil = true;
                    }

                    if ( Math.abs(textStyle[4] - 77.67) <= 1.20 || Math.abs(textStyle[4] - 312.80) <= 1.20 ) {
                        let courtInfo = totalCourtInfo = decodeURIComponent(textContent);
                        let idx = courtInfo.indexOf(' DE ', 0)
                        currCourt.number = courtInfo.slice(0, idx)
                        currCourt.type = courtInfo.slice(idx + 1, courtInfo.length)
                    } else {
                        totalCourtInfo += decodeURIComponent(textContent);
                        let idx = totalCourtInfo.indexOf(' DE ', 0)
                        currCourt.number = totalCourtInfo.slice(0, idx)
                        currCourt.type = totalCourtInfo.slice(idx + 1, totalCourtInfo.length)
                    }
                }

                if (!hitDeLoCivil) {
                    continue;
                }

                //  region caseInfo
                // if (compareArrays(textStyle.slice(0, 3), [2, 11.55, 0])) {
                if (
                    currCourt.number !== ''
                    && currCourt.type !== ''
                    && /^g_\w+_f2$/.test(text.fontName) === true
                    && compareArrays(textStyle.slice(0, 4), [8.55, 0, 0, 9])) {
                    if ( Math.abs(textStyle[4] - 77.67) <= 1.20 || Math.abs(textStyle[4] - 312.80) <= 1.20 ) {

                        //  new case info
                        if (currCaseItem.caseInfo) {
                            let tmp = /Núm\. ?Exp\. ?(\d+\/\d+)/.exec(currCaseItem.caseInfo);
                            currCaseItem.numExp = tmp ? (tmp[1] ?? '') : '';
                            if (!caseItems[i]) caseItems[i] = [];
                            caseItems[i].push(currCaseItem);
                        }
                        if (textContent === 'AUDIENCIA' || textContent.indexOf('LA SECRETARIA') === 0 || textContent.indexOf('EL SECRETARIO') === 0 || textContent.indexOf('LIC. ') === 0) {
                            continue;
                        }

                        currCaseItem = {
                            issue: currIssue,
                            audienceNumber: currCourt.number,
                            audienceType: currCourt.type,
                            secretary: currSecretaria,
                            numExp: '',
                            page: currPage,
                            caseInfo: textContent
                        };
                    } else {
                        //  case contents
                        currCaseItem.caseInfo += textContent;
                    }
                    continue;
                }
                //  endregion

                //  watermark
                // if (compareArrays(textStyle.slice(1, 3), [27, 0])) {
                if (/^g_\w+_f24$/.test(text.fontName) === true) {
                    continue
                }

                //  issue
                // if (/.+del 202\d+/g.test(textContent) && compareArrays(textStyle.slice(0, 3), [2, 12, 0])) {
                if ( /^g_\w+_f22$/.test(text.fontName) === true && /.+del 202\d+/g.test(textContent)) {
                    let words = /\w+ (\d+) de (\w+) del (\d+)/.exec(textContent);
                    let mo = mexicanos_month.indexOf(words[2]);
                    mo = mo < 10 ? `0${mo}` : mo;
                    currIssue = `${words[3]}-${mo}-${words[1]}`;
                    continue;
                }

                //  secretaria info
                if (/^g_\w+_f1$/.test(text.fontName) === true && textContent.indexOf("SECRETAR") >= 0 && compareArrays(textStyle.slice(0, 4), [8.55, 0, 0, 9])) {
                    let tmp = /SECRETARÍA “(\w)”/g.exec(textContent);
                    if (!tmp) continue;
                    currSecretaria = tmp[1];
                    continue;
                }

                //  page number ts.0 => font-face, ts.1 => font-size, ts.2 => font-weight: bold
                if (
                    textContent.trim().length > 0
                    && /^g_\w+_f3$/.test(text.fontName) === true
                    && compareArrays(textStyle.slice(0, 4), [9, 0, 0, 9])
                    && /^\d+$/.test(textContent.trim()) === true
                ) {
                    currPage = parseInt(textContent);
                    if (!currPage){
                        console.log(text, textContent);
                    }
                }

            }
        }

        return caseItems;
    }

    /**
     * @param file_buffer
     * @returns {Promise<unknown>}
     */
    async getPageInfo(file_buffer) {
        let casesInfo = [];
        return new Promise(resolve => {
            PDFjsLib.getDocument(file_buffer).promise.then(async (doc) => {
                for (let i = 1; i <= doc.numPages; i ++) {
                    let textItems = await doc.getPage(i)
                        .then(page => {
                            let textInfo = page.getTextContent();
                            page.cleanup();
                            return textInfo;
                        });
                    let finalTextItems = [];
                    textItems.items.forEach((item, index) =>  {
                        if (item.str !== '') {
                            finalTextItems.push(item);
                        }
                    });
                    casesInfo.push(finalTextItems);
                }
                resolve(casesInfo);
            }).catch(reason => console.log(reason));
        });
    }

}

module.exports = PDF2CSV;