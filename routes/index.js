const express = require('express');
const router = express.Router();
const qcc = require('../spider/qichacha');
const wenshu = require('../spider/wenshu');
const NodeCache = require("node-cache");
const myCache = new NodeCache({stdTTL: 1800, checkperiod: 120});
const accounts = require('../config/qcc-account');

let browser = [];
let curBrowser = 0;
async function loginQichacha(userName, password) {
    console.log(`尝试登录企查查用户${userName}, ${password}`);
    const puppeteer = require('puppeteer-extra');
    const pluginStealth = require("puppeteer-extra-plugin-stealth");
    puppeteer.use(pluginStealth());
    const a = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox']
    });
    const page = await a.newPage();
    await page.goto('https://www.qichacha.com/');
    await page.click('.navi-btn');
    await page.waitFor(3000);
    await page.click('#normalLogin');
    await page.waitFor(1000);
    await page.type('#nameNormal', userName);
    await page.waitFor(1000);
    await page.type('#pwdNormal', password);
    await page.waitFor(1000);
    const checkEle = await page.$('#dom_id_one');
    const rect = await page.evaluate((checkEle) => {
        const {top, left, bottom, right} = checkEle.getBoundingClientRect();
        return {top, left, bottom, right};
    }, checkEle);
    let checkBarState = true;
    let checkTimes = 0;
    while (checkBarState) {
        if (checkTimes > 10) {
            break;
        }
        console.log('条形验证码验证中');
        await page.mouse.move(rect.left + 10, rect.top + 10);
        await page.mouse.down();
        await page.waitFor(100);
        await page.mouse.move(rect.right + 50, rect.top + 10, {steps: 1});
        await page.waitFor(100);
        await page.mouse.up();
        try {
            // 可能会校验失败
            await page.waitFor('.errloading', {timeout: 3000});
            await page.click('.errloading a');
            console.log('条形验证失败');
        } catch (e) {
            console.log('验证通过，没有失败元素');
            checkBarState = false;
            checkTimes++;
        }
    }
    if (checkTimes > 10) {
        await a.close();
        return null;
    }
    await page.click('.login-btn');
    await page.waitFor(3000);
    await page.close();
    return a;
}

(async () => {
    accounts.map(async (account) => {
        if (!account.user || !account.password) {
            return null;
        }
        const b = await loginQichacha(account.user, account.password);
        if (b) {
            browser.push(b);
        }
    })
})();
let browserEx;
(async () => {
    const puppeteer = require('puppeteer-extra');
    const pluginStealth = require("puppeteer-extra-plugin-stealth");
    puppeteer.use(pluginStealth());
    browserEx = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox']
    });
})();

Date.prototype.Format = function (fmt) { //author: meizz
    const o = {
        "M+": this.getMonth() + 1, //月份
        "d+": this.getDate(), //日
        "h+": this.getHours(), //小时
        "m+": this.getMinutes(), //分
        "s+": this.getSeconds(), //秒
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度
        "S": this.getMilliseconds() //毫秒
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (let k in o)
        if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
};


/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', {title: 'Express'});
});
/**
 * 文书网
 */
router.get('/api/:apiType', async function (req, res, next) {
    const apiType = req.params.apiType;
    if (!apiType || apiType.length <= 0) {
        return res.json({
            status: false,
            message: 'API路径错误'
        });
    }
    const key = req.query.name;
    if (!key || key.length <= 0) {
        return res.json({
            status: true,
            message: '请输入查询公司'
        });
    }
    try {
        let result = myCache.get(key + '_' + apiType);
        if (!result) {
            switch (apiType) {
                case 'wenshu':
                    result = await wenshu(key, browserEx);
                    break;
                case 'qichacha':
                    let temp;
                    if (browser.length > 0) {
                        temp = browser[curBrowser];
                        curBrowser++;
                        if (curBrowser >= browser.length) {
                            curBrowser = 0;
                        }
                    }
                    result = await qcc(key, temp);
                    break;
            }
            if (result) {
                myCache.set(key + '_' + apiType, result);
            }
        }
        await res.json({
            status: true,
            message: '查询成功',
            data: result,
            dataTime: new Date().Format("yyyyMMdd")
        });
    } catch (e) {
        await res.json({
            status: false,
            message: `程序错误:${e.message}`
        })
    }
});

module.exports = router;
