const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({
        headless: false
    });
    const first = await browser.newPage();
    await first.goto('http://wenshu.court.gov.cn/');
    await first.type('.searchKey.search-inp', '小米科技');
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
    let caseList;
    console.log(`共有${caseNum}篇案件`);
    if (caseNum < 6) { // 默认一页5篇
        await first.waitForSelector('a.caseName');
        caseList = await first.evaluate(() => {
            const list = Array.from(document.querySelectorAll('a.caseName'));
            return list.map(ele => {
                const title = ele.textContent.replace(/<[\/]?[a-z":=\s]+>/g, '');
                return `${title} - ${ele.href}`;
            });
        });
    } else { // 超过6篇
        await first.waitForSelector('.WS_my_pages .pageSizeSelect');
        await first.evaluate(() => {
            document.querySelector('.pageSizeSelect option:nth-child(3)').selected = true;
        });
        await first.waitForSelector('a.caseName');
        caseList = await first.evaluate(() => {
            const list = Array.from(document.querySelectorAll('a.caseName'));
            return list.map(ele => {
                const title = ele.textContent.replace(/<[\/]?[a-z":=\s]+>/g, '');
                return `${title} - ${ele.href}`;
            });
        });
        if (caseNum > 15) {
            const PageSize = Math.ceil((caseNum > 200 ? 200 : caseNum) / 15);
            console.log(`共有${PageSize}页`);
            for (let i = 1 ; i < PageSize ; i++) {
                try {
                    await Promise.all([
                        first.waitForNavigation(),
                        first.click('.left_7_3 a:nth-last-child')
                    ]);
                } catch (e) {
                    console.log('捕获超时');
                }
                await first.waitForSelector('a.caseName');
                caseList = caseList.concat(await first.evaluate(() => {
                    const list = Array.from(document.querySelectorAll('a.caseName'));
                    return list.map(ele => {
                        const title = ele.textContent.replace(/<[\/]?[a-z":=\s]+>/g, '');
                        return `${title} - ${ele.href}`;
                    });
                }));
            }
        }
    }
    console.log(caseList);
    await browser.close();
})();
