module.exports = class ServerError extends Error{
    constructor(status_code, message){
        super(message)
        this.status_code = status_code
    }
}