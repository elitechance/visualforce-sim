/**
 * Created by EGomez on 7/17/17.
 */

declare let $:any;
class Manager {
    private request(args, callback) {
        $.ajax({
            type:'POST',
            url:'/apex/remote',
            data: JSON.stringify(args),
            contentType:'application/json',
            success: (data) => {
                callback(data);
            }
        });
    }

    public invokeAction(...args) {
        setTimeout(()=>{
            let controller = args[0];
            let length = args.length;
            let callback;
            let options;
            let lastArgument = args[length-1];
            switch (typeof lastArgument) {
                case 'object': callback = args[length-2]; options = lastArgument; break;
                case 'function': callback = lastArgument; break;
            }
            this.request(args, callback);
        },10);
    }
}

class Remoting {
    public Manager: Manager = new Manager();
}

class Visualforce {
    public static remoting: Remoting = new Remoting();
}

(function(Visualforce){
    if (!(<any>window).Visualforce) {
        (<any>window).Visualforce = Visualforce;
    }
})(new Visualforce());
