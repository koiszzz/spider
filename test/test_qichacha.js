const qcc = require('../spider/qichacha');

(async () => {
    try {
        const res = await qcc('小米科技');
        console.log(res);
    } catch (e) {
        console.log(`程序错误:${e.message}`);
    }
})();
