const accounts = require('../configs/qcc-accounts');

module.exports = async function (page) {
    await page.click('#normalLogin');
    await page.waitFor(1000);
    await page.type('#nameNormal', accounts[0].user);
    await page.waitFor(1000);
    await page.type('#pwdNormal', accounts[0].password);
    await page.waitFor(1000);
    let checkEle = await page.$('#dom_id_one');
    if (!checkEle) {
        checkEle = await page.$('#dom_id_two');
    }
    const rect = await page.evaluate((checkEle) => {
        const {top, left, bottom, right} = checkEle.getBoundingClientRect();
        return {top, left, bottom, right};
    }, checkEle);
    let checkBarState = true;
    let checkTimes = 0;
    const maxTry = 10;
    while (checkBarState) {
        if (checkTimes > maxTry) {
            break;
        }
        console.log('条形验证码验证中');
        await page.mouse.move(rect.left + 10, rect.top + 10);
        await page.mouse.down();
        await page.waitFor(100);
        // await page.mouse.move((rect.right + rect.left) / 2 + 30, rect.top + 10, {steps: 1});
        // await page.waitFor(100);
        await page.mouse.move(rect.right + 50, rect.top + 10, {steps: 1});
        await page.waitFor(100);
        await page.mouse.up();
        await page.waitFor(1500);
        try {
            // 可能会校验失败
            await page.waitFor('.errloading', {timeout: 2000});
            await page.click('.errloading a');
            await page.waitFor(1500);
            console.log('条形验证失败');
            checkTimes++;
        } catch (e) {
            console.log('验证通过，没有失败元素');
            checkBarState = false;
        }
    }
    if (checkTimes > maxTry) {
        return false;
    }
    await page.click('.login-btn');
    await page.waitFor(3000);
    return true;
};
