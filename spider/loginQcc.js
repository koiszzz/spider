module.exports = async function loginQichacha(userName, password) {
    console.log(`尝试登录企查查用户${userName}, ${password}`);
    const puppeteer = require('puppeteer-extra');
    const pluginStealth = require("puppeteer-extra-plugin-stealth");
    puppeteer.use(pluginStealth());
    const a = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox'],
        // headless: true
    });
    const page = await a.newPage();
    await page.goto('https://www.qichacha.com/');
    try {
        await page.waitFor('.modal-open');
        console.log('可能有弹窗');
        await page.click('.modal.fade.in button.close');
        await page.waitFor(1500);
        // await page.goto('https://www.qichacha.com/');
    } catch (e) {
        console.log('没有弹窗');
    }
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
        await page.waitFor(1500);
        try {
            // 可能会校验失败
            await page.waitFor('.errloading', {timeout: 3000});
            await page.click('.errloading a');
            await page.waitFor(1500);
            console.log('条形验证失败');
            checkTimes++;
        } catch (e) {
            console.log('验证通过，没有失败元素');
            checkBarState = false;
        }
    }
    if (checkTimes > 10) {
        console.log('超过登录尝试最大次数，登录失败');
        await a.close();
        return null;
    }
    await page.click('.login-btn');
    await page.waitFor(3000);
    await page.close();
    return a;
};
