module.exports = function tinythen(obj, method, ...args) {
  return {
    then: (resolve, reject) => {
      function done(err, thing) {
        if (err) return reject(err);
        resolve(thing);
      }
      if (!args.length) return obj[method](done);
      obj[method](...args, done);
    }
  }
}
