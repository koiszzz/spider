module.exports = async function (person, browser) {
    if (!person || typeof person !== 'string' || person.length <= 0) {
        throw new Error('请输入人名');
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
        await first.goto(`https://www.qcc.com/boss_search?key=${person}&industryInfo=&areaInfo=福建%20泉州市%20晋江市`, waitOption);
        const data = await first.evaluate(() => {
            const findNum = +document.querySelector('.m_search_head .font-15.text-dark .text-danger').textContent.trim();
            if (findNum === 0) {
                return [];
            }
            return Array.from(document.querySelectorAll('.col-xs-6.boss-list')).map((e) => {
                return {
                    'boss-name': e.querySelector('.boss-name').textContent.trim(),
                    'boss-province-info': e.querySelector('.boss-province-info').textContent.replace(/[\s\r\n]+/g, ' ').trim(),
                    'boss-partner': e.querySelector('.boss-partner').textContent.replace('其他合作伙伴', '').replace(/[\s\r\n]+/g, ' ').trim()
                }
            });
        });
        return data;
    } catch (e) {
        console.log(e);
        throw new Error(`模拟抓取出错:${e.message}`);
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
