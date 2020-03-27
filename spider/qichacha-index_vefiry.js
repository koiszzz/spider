module.exports = async function (page) {
    let checkEle = await page.$('#dom_id');
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
        console.log('超过最大登录尝试次数');
        return false;
    }
    await page.click('#verify');
    await page.waitFor(1500);
    return true;
};
