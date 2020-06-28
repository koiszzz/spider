const puppeteer = require('puppeteer');
const login = require('./qichacha-user_login');
const verify = require('./qichacha-index_vefiry');

module.exports = async function (company, browser) {
    if (!company || typeof company !== 'string' || company.length <= 0) {
        throw new Error('请输入公司名称');
    }
    let newBrowser = false;
    if (browser === undefined || browser === null) {
        browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox']
        });
        newBrowser = true;
    }
    company = company.replace(/[/(]/g, '（').replace(/[/)]/g, '）');
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
        // await first.goto('https://www.qichacha.com/', waitOption);
        // await first.type('#searchkey', company);
        // await first.click('.index-searchbtn');
        // await first.waitFor(1500);
        // const checkCurPage = await first.evaluate(() => {
        //     const errorEle = document.querySelector('.error');
        //     if (errorEle) {
        //         return -1;
        //     }
        //     return 0;
        // });
        // console.log('页面检查结果:' + checkCurPage);
        // if (checkCurPage === -1) { //账户可能被暂封了
        //     return {};
        // }
        await first.goto(`https://www.qcc.com/search?key=${company}`, waitOption);
        if (first.url().indexOf('user_login') >= 0) {
            const loginRs = await login(first);
            if (loginRs) {
                console.log('登录成功');
            } else {
                throw new Error('登录预设用户失败');
            }
        }
        if (first.url().indexOf('index_verify') >= 0) {
            console.log('系统需要通过验证码才可以查询');
            const loginRs = await verify(first);
            if (loginRs) {
                console.log('验证成功');
            } else {
                throw new Error('验证码验证失败');
            }
        }
        await first.waitForSelector('#countOld');
        // 判断查询结果数量
        const searchCount = await first.evaluate(() => {
            const count = document.querySelector('#countOld .text-danger').textContent.trim();
            return +count;
        });
        if (searchCount === 0) {
            console.log('没有找到该企业名称');
            return {};
        }
        await first.waitForSelector('#search-result');
        const matchCompanies = await first.evaluate(() => {
            return Array.from(document.querySelectorAll('#search-result tr:not(.frtr)')).map((e) => {
                const d = {
                    name: e.querySelector('.ma_h1').textContent.trim(),
                    url: e.querySelector('.ma_h1').href,
                    tags: e.querySelector('.search-tags').textContent.trim(),
                    status: e.querySelector('.statustd').textContent.trim().replace(/([^\s]+)\s*([^\s]+)\s*(微信或企查查APP 扫一扫查看详情)?(企查查APP 扫一扫查看详情)?/, '$1'),
                    search: e.querySelector('p:not(.m-t-xs)').textContent.trim()
                };
                Array.from(e.querySelectorAll('.m-t-xs')).map((z) => {
                    return z.textContent.trim().replace('更多号码', '').replace(/[\r\n]+/g, '').replace(/[\s]+/g, ' ').replace(/：\s+/, '：').replace(/\s/g, ';;;')
                }).join(';;;').split(';;;').map((v) => {
                    if (v && v.length > 0) {
                        const s = v.split('：');
                        if (s.length === 2) {
                            d[s[0]] = s[1];
                        }
                    }
                });
                if (d.search.includes('曾用名：')) {
                    d.usedName = d.search.replace('曾用名：', '');
                }
                return d;
            });
        });
        let filterResult = matchCompanies.filter((v) => {
            return (v.name === company || (v.usedName && v.usedName === company)) && v.tags.length <= 0; // 可能有同名的外企，优先滤掉外企
        });
        if (filterResult.length <= 0) {
            filterResult = matchCompanies.filter((v) => {
                return v.name === company || (v.usedName && v.usedName === company); // 如果没有找到 再匹配外企
            });
            if (filterResult.length <= 0) {
                return {};
            }
        }
        await first.goto(filterResult[0].url);
        await first.waitForSelector('a.company-nav-head');
        const base_url = await first.evaluate(() => {
            const navs = Array.from(document.querySelectorAll('a.company-nav-head'));
            for (let i = 0; i < navs.length; i++) {
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
            await first.goto(base_url);
        }
        await first.waitForSelector('#Cominfo');
        const content = await first.evaluate(() => {
            let info = {
                basic_info: '',
                changes: [],
                intro: ''
            };
            Array.from(document.querySelector('#Cominfo').querySelectorAll('td')).map((row, index) => {
                info.basic_info += row.textContent.replace(/[\r\n\s]+/g, '').trim();
                if (index % 2 == 1) {
                    info.basic_info += '\r\n';
                } else {
                    info.basic_info += ':';
                }
            });
            info.basic_info = info.basic_info.replace(/[他]?关联([\s]?\d{1,})?家企业/, '').replace('>', '')
                .replace('查看地图', '').replace('附近企业', '');
            const sections = ['partnerslist', 'Mainmember', 'touzilist', 'branchelist', 'stockholderslist'];
            sections.map((id) => {
                const listElement = document.querySelector('#' + id);
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
                            .replace(/[他]?关联([\s]?\d{1,})?家企业[\s]+>/, '')
                            .replace(/[\r\n]+/g, '')
                            .replace('查看最终受益人>', '')
                            .replace(/([\u4e00-\u9fa5]+\s+序号\s+([\u4e00-\u9fa5]+))/, "$2")
                            .replace(/(\d*)\s*([\u4e00-\u9fa5()（）]*)\s*([\u4e00-\u9fa5()（）]*)\s*([\u4e00-\u9fa5]*)\s*>/, "$2")
                            .trim();
                    }));
                });
                info[id] = res;
            });

            const Changelist = document.querySelector('#Changelist');
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
            const Comintroduce = document.querySelector('#Comintroduce');
            if (Comintroduce) {
                Comintroduce.querySelector('h3').remove();
                info.intro = Comintroduce.textContent.replace(/[\r\n\s]+/g, '');
            }
            return info;
        });
        return content;
    } catch (e) {
        console.log(e);
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
