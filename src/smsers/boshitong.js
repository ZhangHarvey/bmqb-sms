import _ from 'lodash';
import moment from 'moment';
import SmserAbstract from './abstract';
import { md5 } from '../utils';
import SmsResponse from '../sms_response';
import { InvalidArgumentException } from '../exceptions';


export default class Boshitong extends SmserAbstract {
  static fetchBatchId(str) {
    if (str && !(str instanceof String)) {
      throw new InvalidArgumentException('Response must be a String');
    }
    if (!str) {
      // 自定义批次号
      return moment().format('YYYYMMDDHHmmss') + new Date().getMilliseconds();
    }
    // 如果发送成功的话，则返回内容为：`0,{批次号}`
    const reg = /^0,(.*)$/;
    const matches = str.match(reg);
    if (matches instanceof Array && matches.length === 2) {
      return matches[1];
    }

    return null;
  }

  constructor(_config, request) {
    super({
      domain: null,
      uid: null,
      pwd: null,
      srcphone: null,
    });
    this.setConfig(_config);
    this.request = request;
  }

  sendVcode(mobile, msg) {
    return this.sendSms(mobile, msg);
  }

  sendSms(mobile, msg) {
    if (!msg || !mobile) {
      throw new InvalidArgumentException('Please specify params: mobile and msg!');
    }

    return this.send('/cmppweb/sendsms', {
      mobile,
      msg,
    }).then(res => {
      const batchId = Boshitong.fetchBatchId(res);
      return new SmsResponse({
        ssid: batchId,
        status: batchId ? 'success' : 'failed',
        body: res,
      });
    });
  }

  sendPkg(pkg) {
    if (!_.isArray(pkg) || !pkg.length) {
      throw new InvalidArgumentException('Invalid format: pkg!');
    }
    if (pkg.length > 1000) {
      throw new InvalidArgumentException('Every time may not be sent more than 1000 msg');
    }
    // 变换成字符串
    const pkgStr = JSON.stringify(pkg);

    return this.send('/cmppweb/sendsmspkg', {
      msg: pkgStr,
    }).then(res => {
      const batchId = Boshitong.fetchBatchId(res);
      return new SmsResponse({
        ssid: batchId,
        status: batchId ? 'success' : 'failed',
        body: res,
      });
    });
  }

  send(api, data) {
    const qs = {
      uid: this.config.uid,
      pwd: md5(this.config.pwd),
      srcphone: this.config.srcphone,
    };
    Object.assign(qs, data);

    return this.request({
      url: this.config.domain + api,
      method: 'POST',
      qs,
      timeout: 10000,
      useQuerystring: true,
    });
  }

}
