const express = require('express');
const router = express.Router();
const qcc= require('../spider/qichacha');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});
/**
 * 文书网
 */
router.get('/wenshu', async function (req, res, next) {
  return res.json({
    status: false,
    message: '文书网API暂不可用'
  });
});
/**
 * 企查查企业基本信息
 */
router.get('/qichacha', async function (req, res, next) {
  const key = req.query.key;
  if (!key || key.length <= 0) {
    return res.json({
      status: true,
      message: '请输入查询公司'
    });
  }
  try {
    const result = await qcc(key);
    await res.json({
      status: true,
      message: '查询成功',
      data: result
    });
  } catch (e) {
    await res.json({
      status: false,
      message: `程序错误:${e.message}`
    })
  }
});

module.exports = router;
