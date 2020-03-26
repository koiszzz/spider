const login = require('./qichachaPageLogin');

module.exports = async function (company, browser) {
    if (!company || typeof company !== 'string' || company.length <= 0) {
        throw new Error('请输入公司名称');
    }
    if (browser === undefined || browser === null) {
        throw new Error('请提供用户登录的浏览器');
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
        await first.goto(`https://www.qcc.com/search?key=${company}`, waitOption);
        if (first.url().indexOf('user_login') >= 0) {
            const loginRs = await login(first);
            if (loginRs) {
                console.log('登录成功');
            } else {
                throw new Error('登录预设用户失败');
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
            return [];
        }

        await first.waitForSelector('#search-result');
        const matchCompanies = await first.evaluate(() => {
            return Array.from(document.querySelectorAll('#search-result tr:not(.frtr)')).map((e) => {
                const d = {
                    name: e.querySelector('.ma_h1').textContent.trim(),
                    url: e.querySelector('.ma_h1').href,
                    tags: e.querySelector('.search-tags').textContent.trim(),
                    status: e.querySelector('.statustd').textContent.trim().replace(/([^\s]+)\s*([^\s]+)\s*(微信或企查查APP 扫一扫查看详情)?(企查查APP 扫一扫查看详情)?/, '$1'),
                    search: e.querySelector('p:not(.m-t-xs)').textContent.trim(),
                    baseInfo: {}
                };
                Array.from(e.querySelectorAll('.m-t-xs')).map((z) => {
                    return z.textContent.trim().replace('更多号码', '').replace(/[\r\n]+/g, '').replace(/[\s]+/g, ' ').replace(/：\s+/, '：').replace(/\s/g, ';;;')
                }).join(';;;').split(';;;').map((v) => {
                    if (v && v.length > 0) {
                        const s = v.split('：');
                        if (s.length === 2) {
                            d.baseInfo[s[0]] = s[1];
                        }
                    }
                });
                if (d.search.includes('曾用名：')) {
                    d.usedName = d.search.replace('曾用名：', '');
                }
                return d;
            });
        });
        return matchCompanies.filter((v) => {
            return v.name === company || (v.usedName && v.usedName === company);
        });
    } catch (e) {
        throw new Error(`模拟抓取出错,${e.message}`);
    } finally {
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
};
