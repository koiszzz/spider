const express = require('express');
const router = express.Router();
const qcc= require('../spider/qichacha');
const wenshu = require('../spider/wenshu');
const NodeCache = require( "node-cache" );
const myCache = new NodeCache({ stdTTL: 1800, checkperiod: 120 });

Date.prototype.Format = function (fmt) { //author: meizz
  const o = {
    "M+": this.getMonth() + 1, //月份
    "d+": this.getDate(), //日
    "h+": this.getHours(), //小时
    "m+": this.getMinutes(), //分
    "s+": this.getSeconds(), //秒
    "q+": Math.floor((this.getMonth() + 3) / 3), //季度
    "S": this.getMilliseconds() //毫秒
  };
  if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
  for (let k in o)
    if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
  return fmt;
};


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});
/**
 * 文书网
 */
router.get('/wenshu', async function (req, res, next) {
  const key = req.query.name;
  if (!key || key.length <= 0) {
    return res.json({
      status: true,
      message: '请输入查询公司'
    });
  }
  try {
    let result = myCache.get(key+'_wenshu');
    if (!result) {
      result = await wenshu(key);
      if (result) {
        myCache.set(key+'_wenshu', result);
      }
    }
    await res.json({
      status: true,
      message: '查询成功',
      data: result,
      dataTime: new Date().Format("yyyyMMdd")
    });
  } catch (e) {
    await res.json({
      status: false,
      message: `程序错误:${e.message}`
    })
  }
});
/**
 * 企查查企业基本信息
 */
router.get('/qichacha', async function (req, res, next) {
  const key = req.query.name;
  if (!key || key.length <= 0) {
    return res.json({
      status: true,
      message: '请输入查询公司'
    });
  }
  try {
    let result = myCache.get(key + '_qcc');
    if (!result) {
      result = await qcc(key);
      if (result) {
        myCache.set(key + '_qcc', result);
      }
    }
    await res.json({
      status: true,
      message: '查询成功',
      data: result,
      dataTime: new Date().Format("yyyyMMdd")
    });
  } catch (e) {
    await res.json({
      status: false,
      message: `程序错误:${e.message}`
    })
  }
});

module.exports = router;
