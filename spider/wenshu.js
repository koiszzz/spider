const puppeteer = require('puppeteer-extra');
const pluginStealth = require("puppeteer-extra-plugin-stealth")
puppeteer.use(pluginStealth());

module.exports = async function (key) {
    const browser = await puppeteer.launch({
        headless: true,
    });
    try {
        const first = await browser.newPage();
        await first.goto('http://wenshu.court.gov.cn/');
        const access = await first.waitForResponse(res => {
            return res.url().includes('rest.q4w');
        });
        if (access.status() !== 200) {
            throw new Error('文书网无法访问');
        }
        await first.waitForSelector('.searchKey.search-inp');
        await first.type('.searchKey.search-inp', key);
        try {
            await Promise.all([
                first.waitForNavigation(),
                first.click('.search-rightBtn.search-click')
            ]);
        } catch (e) {
            console.log('等待超时');
        }
        await first.waitForSelector('.fr.con_right span');
        let caseNum = await first.evaluate(() => {
            return document.querySelector('.fr.con_right span').textContent;
        });
        if (caseNum === undefined || caseNum === '0') {
            return [];
        }
        await first.waitForSelector('a.caseName');
        let caseList = await first.evaluate(() => {
            const list = Array.from(document.querySelectorAll('a.caseName'));
            return list.map(ele => {
                const title = ele.textContent.replace(/<[\/]?[a-z":=\s]+>/g, '');
                return {
                    title: title,
                    href: ele.href
                };
            });
        });
        console.log(`共有${caseNum}篇案件`);
        if (caseNum >= caseList.length) { // 默认一页5篇
            let nextPage = 2;
            const pageSize = caseList.length;
            const pageNum = Math.ceil(caseNum > 200 ? 200 / pageSize : caseNum / pageSize);
            while (nextPage <= pageNum) {
                await first.waitFor(1000);
                await first.waitForSelector(`.left_7_3 .pageButton[value="${nextPage}"]`);
                await first.click(`.left_7_3 .pageButton[value="${nextPage}"]`);
                await first.waitForResponse((res) => res.url().includes('rest.q4w'));
                await first.waitFor(2000);
                await first.waitForSelector('a.caseName');
                caseList = caseList.concat(await first.evaluate(() => {
                    const list = Array.from(document.querySelectorAll('a.caseName'));
                    return list.map(ele => {
                        const title = ele.textContent.replace(/<[\/]?[a-z":=\s]+>/g, '');
                        return {
                            title: title,
                            href: ele.href
                        };
                    });
                }));
                nextPage++;
            }
        }
        for (let i = 0; i < caseList.length; i++) {
            await first.goto(caseList[i].href);
            await first.waitForSelector('.PDF_box');
            const doc = await first.evaluate(() => {
                return document.querySelector('.PDF_box').innerHTML;
            });
            caseList[i].doc = doc;
        }
        return caseList;
    } catch (e) {
        throw e;
    } finally {
        await browser.close();
    }
}
