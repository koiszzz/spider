const puppeteer = require('puppeteer-extra');
const pluginStealth = require("puppeteer-extra-plugin-stealth");
puppeteer.use(pluginStealth());

module.exports = async function (company) {
    if (!company || typeof company !== 'string' || company.length <= 0) {
        throw new Error('请输入公司名称');
    }
    const browser = await puppeteer.launch({
        headless: false,
        // executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        args: ['--no-sandbox']
    });
    try {
        const first = await browser.newPage();
        await first.goto('https://www.creditchina.gov.cn');
        await first.waitForSelector('#search_input');
        await first.type('#search_input', company);
        await first.waitForSelector('.search_btn');
        let newPagePromise = new Promise(x => browser.once('targetcreated', target => x(target.page())));
        await first.click('.search_btn');
        const second = await newPagePromise;
        await second.waitForSelector('.companylists .company-item');
        newPagePromise = new Promise(x => browser.once('targetcreated', target => x(target.page())));
        await second.click('.companylists .company-item');
        const third = await newPagePromise;
        third.on('response', async res => {
            console.log(res.url(), res.status());
        });
    } catch (e) {
        throw e;
    } finally {
        // await browser.close();
    }
};
