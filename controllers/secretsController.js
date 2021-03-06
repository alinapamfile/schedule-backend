const HttpStatus = require('http-status-codes')
const Cryptr = require('cryptr')

exports.addSecret = async (req, res) => {
  try {
    const cryptr = new Cryptr(req.config.SECRET_KEY)
    const isAdmin = req.user.admin
    if (!isAdmin) {
      throw new Error('Access denied. You must be an admin!')
    }

    const secret = await req.db.Secret.findOne({
      key: req.body.key,
      env: req.body.env
    })
    req.body.value = cryptr.encrypt(req.body.value)
    if (secret !== null) {
      return res.status(HttpStatus.CONFLICT).json({
        success: false,
        message: 'Secret already exists! If you want to change it apply an UPDATE operation.'
      })
    }

    await req.db.Secret.create(req.body)

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Secret added!'
    })
  } catch (error) {
    req.log.error(`Unable to add secret due to error: ${error}`)
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Something bad happened!'
    })
  }
}

exports.updateSecret = async (req, res) => {
  try {
    const cryptr = new Cryptr(req.config.SECRET_KEY)

    const secret = await req.db.Secret.findOne({
      key: req.body.key,
      env: req.body.env
    })
    req.body.value = cryptr.encrypt(req.body.value)
    if (secret === null) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: 'Secret doesn\'t exists! If you want to add it apply a POST call.'
      })
    }

    await req.db.Secret.updateOne(secret[0], req.body)

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Secret updated!'
    })
  } catch (error) {
    req.log.error(`Unable to add secret due to error: ${error}`)
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Something bad happened!'
    })
  }
}
