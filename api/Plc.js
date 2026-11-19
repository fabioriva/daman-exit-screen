import { EventEmitter } from "events";
import snap7 from "node-snap7";
import pino from "pino";
import util from "util";

const logger = pino();

const readArea = util.promisify(
  (client, area, dbNumber, start, amount, wordLen, callback) => {
    client.ReadArea(
      area,
      dbNumber,
      start,
      amount,
      wordLen,
      function (err, s7data) {
        if (err) return callback(err);
        callback(err, s7data);
      }
    );
  }
);

class PLC extends EventEmitter {
  constructor(plc) {
    super();
    this.client = new snap7.S7Client();
    this.online = false;
    this.params = plc;
  }

  async data(def, obj) {
    try {
      const { area, dbNumber, start, amount, wordLen } = def.DATA_READ;
      const buffer = await readArea(
        this.client,
        area,
        dbNumber,
        start,
        amount,
        wordLen
      );
      const data = [];
      let offset = 0;
      for (let i = 0; i < obj.data.length; i++) {
        data.push(buffer.readInt16BE(offset));
        offset += 2;
      }
      obj.data = data;
      obj.online = true;
      obj.lastUpdated = Date.now();
    } catch (e) {
      this.error(e, obj);
    }
  }

  error(e, obj) {
    this.online = false;
    obj.online = false;
    this.client.Disconnect();
    isNaN(e) ? logger.error(e) : logger.error(this.client.ErrorText(e));
  }

  async connect(obj, initial = false) {
    try {
      await new Promise((resolve, reject) => {
        const callback = (err) => err ? reject(err) : resolve();
        if (initial) {
          this.client.ConnectTo(
            this.params.ip,
            this.params.rack,
            this.params.slot,
            callback
          );
        } else {
          this.client.Connect(callback);
        }
      });
      this.online = true;
      obj.online = true;
      logger.info("Connected to PLC %s", this.params.ip);
    } catch (e) {
      this.error(e, obj);
    }
  }

  forever(def, obj) {
    setTimeout(async () => {
      if (this.online) {
        await this.data(def, obj);
      } else {
        logger.info("Connecting to PLC %s ...", this.params.ip);
        await this.connect(obj);
      }
      this.forever(def, obj);
    }, this.params.polling_time);
  }

  async run(def, obj) {
    try {
      await this.connect(obj, true);
      this.forever(def, obj);
    } catch (e) {
      this.error(e, obj);
    }
  }

  async update(buffer, data) {
    let offset = 0;
    for (let i = 0; i < data.length; i++) {
      data[i] = buffer.readInt16BE(offset);
      offset += 2;
    }
  }
}

export default PLC;
