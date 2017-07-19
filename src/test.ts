

function test() {
    let myArray = [1,2,3,4];
    let length = myArray.length;

    myArray.splice(length-1,1);
    myArray.splice(length-2,1);
    console.log(myArray);
}

test();
