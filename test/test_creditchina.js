const cc = require('../spider/creditchina');

(async () => {
    try {
        const res = await cc('小米科技');
        console.log(res);
    } catch (e) {
        console.log(`程序错误:${e.message}`);
    }
})();
