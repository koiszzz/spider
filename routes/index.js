const express = require('express');
const router = express.Router();
const qcc = require('../spider/qichacha');
const wenshu = require('../spider/wenshu');
const loginQichacha = require('../spider/loginQcc');
const NodeCache = require("node-cache");
const myCache = new NodeCache({stdTTL: 1800, checkperiod: 120});
const accounts = require('../config/qcc-account');

let browser = [];
let curBrowser = 0;

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
router.get('/api/wenshu', async function (req, res, next) {
    const key = req.query.name;
    if (!key || key.length <= 0) {
        return res.json({
            status: true,
            message: '请输入查询公司'
        });
    }
    try {
        let result = myCache.get(key + '_wenshu');
        if (!result) {
            result = await wenshu(key, browserEx);
            if (result) {
                myCache.set(key + '_wenshu', result);
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

router.get('/api/qichacha', async (req, res) => {
    const key = req.query.name;
    if (!key || key.length <= 0) {
        return res.json({
            status: true,
            message: '请输入查询公司'
        });
    }
    try {
        let result = myCache.get(key + '_qichacha');
        if (!result) {
            let temp;
            if (browser.length > 0) {
                temp = browser[curBrowser];
                curBrowser++;
                if (curBrowser >= browser.length) {
                    curBrowser = 0;
                }
            }
            result = await qcc(key, temp);
            if (result) {
                myCache.set(key + '_qichacha', result);
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
        });
    }
});

module.exports = router;
