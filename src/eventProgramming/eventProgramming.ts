import './style.css'
import fs from "node:fs"

// function little_request(callback, value) {

// }

// function little_callback(value, reason: string) {

// }

// function little_cancel(reason: string) {

// }

function requestorize(unary) {
    return function requestor(callback, value) {
        try {
            return callback(unary(value));
        } catch (exception: unknown) {
            return callback(undefined, exception);
        }
    };
}


function read_file(directory: string, encoding: string = "utf-8") {
    return function read_file_requestor(callback: any, value: string) {
        return fs.readFile(
            directory + value,
            encoding,
            function (err: NodeJS.ErrnoException | null, data: Buffer) {
                return err
                    ? callback(undefined, err)
                    : callback(data)
            }
        )
    }
}

function send_message(...args: any[]) {
    console.log(args);
}

function factory(service_address: string, args: string) {
    return function requestor(callback: any, value: string) {
        try {
            send_message(
                callback,
                service_address,
                args
            );
        } catch (exception) {
            return callback(undefined, exception);
        }

        return function cancel(reason: string) {
            return send_message(undefined);
        }
    };
}




