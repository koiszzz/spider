const wenshu = require('../spider/wenshu');

(async () => {
    try {
        const res = await wenshu('晋江市新煌星鞋服皮塑有限公司');
        console.log(res);
    } catch (e) {
        console.log(`程序错误:${e.message}`);
    }
})();
