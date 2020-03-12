const puppeteer = require('puppeteer');

module.exports = async function (company, browser) {
    if (!company || typeof company !== 'string' || company.length <= 0) {
        throw new Error('请输入公司名称');
    }
    let newBrowser = false;
    if (browser === undefined || browser === null) {
        browser = await puppeteer.launch({
            headless: fasle,
            args: ['--no-sandbox']
        });
        newBrowser = true;
    }
    let pageContainer = [];
    try {
        const waitOption = {
            timeout: 60000,
            waitUntil: 'networkidle0'
        };
        const first = await browser.newPage();
        if (first) {
            pageContainer.push(first);
        }
        await first.goto('https://www.qichacha.com/', waitOption);
        await first.type('#searchkey', company);
        await first.click('.index-searchbtn');
        await first.waitForSelector('#search-result');
        await first.waitForSelector('#search-result .ma_h1');
        const newPagePromise = new Promise(x => browser.once('targetcreated', target => x(target.page())));
        await first.click('#search-result .ma_h1');
        const second = await newPagePromise;
        if (second) {
            pageContainer.push(second);
        }
        await second.waitForSelector('a.company-nav-head');
        const base_url = await second.evaluate(() => {
            const navs = Array.from(document.querySelectorAll('a.company-nav-head'));
            for (let i = 0 ; i < navs.length ; i++) {
                if (navs[i].textContent.includes('基本信息')) {
                    if (i === 0) {
                        return null;
                    } else {
                        return navs[i].href;
                    }
                }
            }
        });
        if (base_url != null) {
            second.goto(base_url);
        }
        await second.waitForSelector('#Cominfo');
        const content = await second.evaluate(() => {
            let messageBody = document.querySelector('.data_div_login');
            if (!messageBody) {
                messageBody = document.querySelector('.data_div');
            }
            const clone = messageBody.cloneNode(true);
            let info = {
                basic_info: '',
                changes: [],
                intro: ''
            };
            Array.from(clone.querySelector('#Cominfo').querySelectorAll('td')).map((row, index) => {
                info.basic_info += row.textContent.replace(/[\r\n\s]+/g, '').trim();
                if (index % 2 == 1) {
                    info.basic_info += '\r\n';
                } else {
                    info.basic_info += ':';
                }
            });
            info.basic_info = info.basic_info.replace(/他关联[\d]+家企业/, '').replace('>', '')
                .replace('查看地图', '').replace('附近企业', '');
            const sections = ['partnerslist', 'Mainmember', 'touzilist', 'branchelist', 'stockholderslist'];
            sections.map((id) => {
                const listElement = clone.querySelector('#' + id);
                if (listElement === undefined || listElement === null) { // 不同企业展示的区块不一样
                    return;
                }
                const tables = Array.from(listElement.querySelectorAll('tbody'));
                if (!tables || tables.length <= 0) {
                    return;
                }
                const res = [];
                const p_table = tables[0];
                Array.from(p_table.children).map((row) => {
                    res.push(Array.from(row.children).map((cell) => {
                        return cell.textContent
                            .replace('查看最终受益人>', '')
                            .replace(/股权结构[\s]+>/, '')
                            .replace('持股详情>', '')
                            .replace(/他关联[\s\d]+家企业[\s]+>/, '')
                            .replace(/[\r\n]+/g, '')
                            .replace('查看最终受益人>', '')
                            .replace(/([\u4e00-\u9fa5]+\s+序号\s+([\u4e00-\u9fa5]+))/, "$2")
                            .replace(/(\d*)\s*([\u4e00-\u9fa5()（）]*)\s*([\u4e00-\u9fa5()（）]*)\s*([\u4e00-\u9fa5]*)\s*>/, "$2")
                            .trim();
                    }));
                });
                info[id] = res;
            });

            const Changelist = clone.querySelector('#Changelist');
            if (Changelist) {
                info.changes.push(Array.from(Changelist.querySelectorAll('th')).map((row) => {
                    return row.textContent.trim();
                }));
                const changes = Array.from(Changelist.querySelectorAll('td')).map((row) => {
                    return row.textContent.replace(/\s+/, '').trim();
                });
                while (changes.length) {
                    info.changes.push(changes.splice(0, info.changes[0].length));
                }
            }
            const Comintroduce = clone.querySelector('#Comintroduce');
            if (Comintroduce) {
                Comintroduce.querySelector('h3').remove();
                info.intro = Comintroduce.textContent.replace(/[\r\n\s]+/g, '');
            }
            return info;
        });
        return content;
    } catch (e) {
        throw new Error(`模拟抓取出错:${e.message}`);
    } finally {
        if (newBrowser) {
            await browser.close();
        } else {
            pageContainer.map(async (page) => {
                if (page) {
                    try {
                        await page.close();
                    } catch (e) {
                        console.log('关闭页面出错');
                    }
                }
            });
        }
    }
};
