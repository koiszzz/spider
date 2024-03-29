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
        // await first.pdf({path: 'login.pdf'});
        await first.waitForSelector('.npanel-heading .text-danger');
        // 判断查询结果数量
        const searchCount = await first.evaluate(() => {
            const count = document.querySelector('.npanel-heading .text-danger').textContent.trim();
            return +count;
        });
        if (searchCount === 0) {
            console.log('没有找到该企业名称');
            return {};
        }
        await first.waitForSelector('.msearch');
        const matchCompanies = await first.evaluate(() => {
            return Array.from(document.querySelectorAll('.msearch tr:not(.frtr).frtrt')).map((e) => {
                const d = {
                    name: e.querySelector('.maininfo .title').textContent.trim(),
                    url: e.querySelector('.maininfo a').href,
                    tags: e.querySelector('.maininfo .search-tags').textContent.trim(),
                    status: e.querySelector('.maininfo .nstatus ') ? e.querySelector('.maininfo .nstatus ').textContent.trim() : '',
                    // search: e.querySelector('p:not(.m-t-xs)').textContent.trim()
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
                if (d.search && d.search.includes('曾用名：')) {
                    d.usedName = d.search.replace('曾用名：', '');
                }
                return d;
            });
        });
        let filterResult = matchCompanies.filter((v) => {
            return (v.name === company || (v.usedName && v.usedName === company)) && v.status === '存续'; // 可能有同名的企业, 先找存续
        });
        if (filterResult.length <= 0) {
            filterResult = matchCompanies.filter((v) => {
                return v.name === company || (v.usedName && v.usedName === company); // 如果没有找到 再匹配外企
            });
            if (filterResult.length <= 0) {
                return {};
            }
        }
        console.log(filterResult);
        console.log(filterResult[0].url);
        await first.waitFor(1000);
        await first.goto(filterResult[0].url);
        // await first.pdf({path: 'page.pdf'});
        console.log(await first.url());
        await first.waitForSelector('.nav-head a');
        const base_url = await first.evaluate(() => {
            const navs = Array.from(document.querySelectorAll('.nav-head a'));
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
        const companyType = await first.$('#cominfo');
        if (companyType) {
            const content = await first.evaluate(() => {
                let info = {
                    basic_info: '',
                    changes: [],
                    intro: ''
                };
                Array.from(document.querySelector('#cominfo').querySelectorAll('td')).map((row, index) => {
                    let str = row.textContent.replace('查看最终受益人>', '')
                        .replace(/股权结构[\s]+>/, '')
                        .replace('持股详情>', '')
                        .replace(/[他]?关联([\s]?\d{1,})?家企业[\s]+>/, '')
                        .replace(/[\r\n]+/g, '')
                        .replace(/最终受益人[>]?/, '')
                        .replace(/([\u4e00-\u9fa5]+\s+序号\s+([\u4e00-\u9fa5]+))/, "$2")
                        .replace(/([\u4e00-\u9fa5]*)\s([\u4e00-\u9fa5]*)\s([\u4e00-\u9fa5]*)?/, "$2")
                        .replace(/(\d*)\s*([\u4e00-\u9fa5()（）]*)\s*([\u4e00-\u9fa5()（）]*)\s*([\u4e00-\u9fa5]*)\s*>/, "$2")
                        .replace(/(.*)复制[\r\n\t\s]?$/, "$1")
                        .replace(/[\r\n\t\s]+/g, ' ')
                        .trim();
                    info.basic_info += str
                    if (index % 2 == 1) {
                        info.basic_info += '\r\n';
                    } else {
                        info.basic_info += ':';
                    }
                });
                info.basic_info = info.basic_info.replace(/[他]?关联([\s]?\d{1,})?家企业/, '').replace('>', '')
                    .replace('查看地图', '').replace('附近企业', '');
                const oldSections = ['partnerslist', 'Mainmember', 'touzilist', 'branchelist', 'stockholderslist'];
                const sections = ['partner', 'mainmember', 'touzilist', 'branchelist', 'publicity'];
                sections.map((id,i) => {
                    const listElement = document.querySelector('#' + id);
                    if (listElement === undefined || listElement === null) { // 不同企业展示的区块不一样
                        return;
                    }
                    const tables = Array.from(listElement.querySelectorAll('table'));
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
                                .replace(/最终受益人[>]?/, '')
                                .replace(/([\u4e00-\u9fa5]+\s+序号\s+([\u4e00-\u9fa5]+))/, "$2")
                                .replace(/([\u4e00-\u9fa5]*)\s([\u4e00-\u9fa5]*)\s([\u4e00-\u9fa5]*)?/, "$2")
                                .replace(/(\d*)\s*([\u4e00-\u9fa5()（）]*)\s*([\u4e00-\u9fa5()（）]*)\s*([\u4e00-\u9fa5]*)\s*>/, "$2")
                                .trim();
                        }));
                    });
                    info[oldSections[i]] = res;
                });

                const Changelist = document.querySelector('#changelist');
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
                return info;
            });
            return content;
        } else {
            return await first.evaluate(() => {
                let info = {
                    basic_info: '',
                    changes: [],
                    intro: ''
                };
                Array.from(document.querySelector('#socominfo').querySelectorAll('td')).map((row, index) => {
                    info.basic_info += row.textContent.replace(/[\r\n\s]+/g, '').trim();
                    if (index % 2 == 1) {
                        info.basic_info += '\r\n';
                    } else {
                        info.basic_info += ':';
                    }
                });
                info.basic_info = info.basic_info.replace(/[他]?关联([\s]?\d{1,})?家企业/, '').replace('>', '')
                    .replace('查看地图', '').replace('附近企业', '');

                return info;
            })
        }

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
