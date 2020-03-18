class sentry{
    constructor() {
        /* For this to work you need to be including the AWS SDK script before this*/

        /*the element that was clicked to trigger s3ntry and that will accept the inserted path from s3ntry*/
        this.target;

        /*Restrictions for file uploads*/
        this.files={};
        this.files.sizelimit = 20000000; /*in bytes*/
        this.files.widthlimit = 2000; /*set to 0 to ignore dimensions*/
        this.files.heightlimit = 0; /*set to 0 to ignore dimensions*/
        this.files.types=['image/jpg','image/jpeg','image/png','image/gif','application/pdf','application/msword','text/plain']; /*set file types allowed ?*/
        
        /* Set your AWS info here*/
        this.yourbucket = "REPLACE-ME";
        this.yourregion = "REPLACE-ME";
        this.basepath = "REPLACE-ME"; /*basepath without trailing slash*/
        this.currentfolder = this.basepath+'/';
        this.folderholder='donotdelete.txt'; /*name of the file created to make a folder "exist", must not be deleted.*/

        /* For the identitypool stuff, follow the instructions here:
        https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/getting-started-browser.html
        Step 1 is all you need, the rest is service specific. */
        this.identitypoolid = "REPLACE-ME";
        
        AWS.config.update({
          region: this.yourregion,
          credentials: new AWS.CognitoIdentityCredentials({
            IdentityPoolId: this.identitypoolid
          })
        });
        
        this.s3 = new AWS.S3({
          apiVersion: "2006-03-01",
          params: { Bucket: this.yourbucket }
        });
        this.s3.config.setPromisesDependency(Promise); /*without this promises don't work in the sdk*/
     
        /*background overlay*/
        let wrapolay = document.createElement('div');
        wrapolay.setAttribute("id",'wrapolays3ntry');
        if(!document.getElementById("wrapolays3ntry")){ document.body.append(wrapolay) }

    }

    async load(target){
        this.target = target;

        /* check for other s3ntries, set its own id */
        let s3ntries = document.querySelectorAll(".s3ntry");
        this.newid = 'sentry'+s3ntries.length;

        /*popup wrapper for file manager*/
        let wrap = document.createElement('div');
        wrap.setAttribute("id",'wrap'+this.newid);
        wrap.classList.add("s3ntry");

        /*insert elements at body end*/        
        document.body.append(wrap);

        /*set active s3ntry element*/
        this.wrap = document.getElementById('wrap'+this.newid);
        this.wrapolay = document.getElementById('wrapolays3ntry');

        this.wrapolay.classList.add("on");
        this.wrap.classList.add("on");

        let vwrapolay = this.wrapolay;
        let vwrap = this.wrap;        
        this.wrapolay.addEventListener("click",function(){
            vwrap.remove();
            vwrapolay.classList.remove("on");
        });

        /*Insert Layout*/
        this.loadstyling();
        this.loadinterface();
        this.listfolders(this.basepath+'/');
        this.listfiles(this.basepath+'/');        
    }

    async listfolders(path){
        let listdata='';        
        let as3ntry = this;

        let listObjectPromise = as3ntry.s3.listObjectsV2({Delimiter: "/", Prefix:path}).promise();
        await listObjectPromise.then(function(data) {
            listdata=data;        

            if(listdata!=''){
                let folderlist = document.createElement('ul');
                let foldernode = document.createElement('li');
                foldernode.classList.add("folder");
                foldernode.innerHTML = `<button style="padding-left:10px;">Home</button>`;
                foldernode.addEventListener('click',function(e){
                    /*close add folder form*/
                    as3ntry.wrap.querySelector("#s3ntryfolderform").classList.remove("on");
                    as3ntry.wrap.querySelector('#s3ntryfolderform input[type="text"]').blur();
                    as3ntry.wrap.querySelector('.s3ntryaddfolder').classList.remove("on");

                    /*close file uploader*/
                    as3ntry.wrap.querySelector(".s3ntryuploadwrap").classList.remove("on");
                    as3ntry.wrap.querySelector('.s3ntryaddfile').classList.remove("on");

                    as3ntry.listfiles('public/'); 
                });
                folderlist.append(foldernode);

                listdata.CommonPrefixes = listdata.CommonPrefixes.sort(o => o.Prefix);

                let folders = listdata.CommonPrefixes.map(function(folder, index) {
                    let foldername = folder.Prefix.toLowerCase().replace(as3ntry.basepath+'/','').replace("/",''); /*remove current path*/

                    /*count occurrences of slashes*/
                    let count = folder.Prefix.match(/\//g).length;
                    let padleft = (count-1)*10+8;

                    let foldernode = document.createElement('li');
                    foldernode.classList.add("folder");
                    foldernode.setAttribute('data-order',index);
                    foldernode.innerHTML = `<button style="padding-left:${padleft}px">${foldername}</button>`;
                    foldernode.addEventListener('click',function(e){                     
                        /*close add folder form*/
                        as3ntry.wrap.querySelector("#s3ntryfolderform").classList.remove("on");
                        as3ntry.wrap.querySelector('#s3ntryfolderform input[type="text"]').blur();
                        as3ntry.wrap.querySelector('.s3ntryaddfolder').classList.remove("on");

                        /*close file uploader*/
                        as3ntry.wrap.querySelector(".s3ntryuploadwrap").classList.remove("on");
                        as3ntry.wrap.querySelector('.s3ntryaddfile').classList.remove("on");
                        
                        as3ntry.listfiles(folder.Prefix); 
                    });
                    folderlist.append(foldernode);
                });

                let message = listdata.CommonPrefixes.length!=0 ? ``: `<p>You do not have any folders. Create one by clicking the "add folder" button.`;

                as3ntry.wrap.querySelector('.s3ntryfolders').innerHTML = '<h2>Folders</h2>'+message;
                as3ntry.wrap.querySelector('.s3ntryfolders').insertAdjacentElement("beforeend",folderlist);
            }
        }).catch(function(err) {
            alert(err);
        });
    }

    async listfiles(path){        
        this.currentfolder = path;
        let listdata='';
        let href ='';
        let as3ntry = this;
        let fileskey = (path=='/'? '' : encodeURIComponent(path) + '/'); /*doing '/_' returns only files not folders*/
        let listObjectPromise = as3ntry.s3.listObjects({Delimiter:"/",Prefix: as3ntry.currentfolder}).promise();

        await listObjectPromise.then(function(data) {
            listdata=data;
        }).catch(function(err){
            console.log(err);
        });
        
        if(listdata!=''){

            let fileshtml =`<div class="s3ntryfileswrap"></div>`;    
            as3ntry.wrap.querySelector('.s3ntrydisplay').innerHTML=fileshtml;

            listdata.CommonPrefixes = listdata.CommonPrefixes.sort(o => o.Prefix);

            let folders = listdata.CommonPrefixes.map(function(folder, index) {
                let foldername = folder.Prefix.toLowerCase().replace(as3ntry.currentfolder,'').replace("/",''); /*remove current path*/
                if(foldername!=''){
                    let foldernode = document.createElement('div');
                    foldernode.classList.add("folder");
                    foldernode.setAttribute('data-order',index);
                    foldernode.innerHTML = `<button class="s3ntryfolderdelete" data-file="${folder.Prefix}">Delete</button><span>${foldername}</span>`;
                    foldernode.addEventListener('click',function(e){
                        if(e.target.classList.contains("s3ntryfolderdelete")){
                            if(confirm("Are you sure you want to delete this folder and all its contents?")){
                                as3ntry.removefolder(as3ntry.currentfolder+foldername+'/',as3ntry);
                            }
                        }else{
                            as3ntry.listfiles(as3ntry.currentfolder+foldername+'/');
                        }
                    });
                    as3ntry.wrap.querySelector('.s3ntryfileswrap').insertAdjacentElement("beforeend",foldernode);
                }
            });

            let visualcounter = listdata.Contents.length;            
            listdata.Contents = listdata.Contents.sort(o => o.Key);

            await listdata.Contents.map(function(file, index) {

                if(file.Size=='0'|| file.Key.indexOf(as3ntry.folderholder)>-1){ visualcounter = visualcounter-1;}
                else{
                    let filename = file.Key.toLowerCase().replace(as3ntry.currentfolder,'').replace("/",'');
                    let filenode = document.createElement('div');
                    filenode.setAttribute('data-order',index);
                    filenode.setAttribute('data-name',filename);
                    filenode.onclick= function(e){ as3ntry.fileevents(e,as3ntry); }
                    if(as3ntry.wrap.querySelector('.s3ntryfileswrap div[data-name="'+filename+'"]')){
                        filenode = as3ntry.wrap.querySelector('.s3ntryfileswrap div[data-name="'+filename+'"]');
                    }else{
                        as3ntry.wrap.querySelector('.s3ntryfileswrap').insertAdjacentElement("beforeend",filenode);
                    }

                    let filedata =  as3ntry.s3.getObject({Key: file.Key}).promise();                        
                    filedata.then(function(data) {
                        let lastmod = new Date(data.LastModified);
                        filenode.setAttribute('data-size',"Size: "+as3ntry.getsize(file.Size)+" -- Last Modified: "+lastmod.toLocaleString());

                        if(data.ContentType.indexOf("image/") > -1){ /*for images*/
                            function encode(d){
                                var str = d.reduce(function(a,b){ return a+String.fromCharCode(b) },'');
                                return btoa(str).replace(/.{76}(?=.)/g,'$&\n');
                            }
                            let filetype = data.ContentType.split('/')[1].toUpperCase();
                            let fileuri = "data:image/png;base64," + encode(data.Body); 

                            filenode.setAttribute('data-mime',data.ContentType);
                            filenode.setAttribute('data-path',file.Key);
                            filenode.classList.add("im");
                            filenode.innerHTML=`
                                <button class="s3ntryinsert">Insert</button>
                                <a class="s3ntrydownload" download="${filename}" href="${fileuri}" >Download</a>
                                <button class="s3ntrydelete">Delete</button>
                                <img width="150" src="${fileuri}" alt="${filename}" title="File: ${filename} -- Size: ${as3ntry.getsize(file.Size)}">                                
                            `;
                        }else{ /*not an image*/
                            let filetype = data.ContentType.split('/')[1].toUpperCase();
                            if(filetype=="PLAIN"){ filetype="TXT";}
                            filenode.setAttribute('data-mime',data.ContentType);
                            filenode.setAttribute('data-type',filetype);
                            filenode.setAttribute('data-path',file.Key);
                            filenode.classList.add("notim");
                            filenode.innerHTML=`
                                <button class="s3ntryinsert">Insert</button>
                                <button class="s3ntrydownload btn">Download</button>
                                <button class="s3ntrydelete">Delete</button>
                                <span title="${filename} - File size: ${as3ntry.getsize(file.Size)}">${filename}</span>
                            `;                        
                        }
                    }).catch(function(err) {
                        console.log(err);
                    });  
                }                
            });
            as3ntry.visualcounter = visualcounter;                 
            as3ntry.updatebreadcrumbs(as3ntry.currentfolder);
        }
    }

    async loadinterface(){
        let layout=`
        <div class="s3ntryhead">
            S3ntry File Manager 
        </div>
        <div class="s3ntryfolders"></div>
        <div class="s3ntryfilewrap">
            <div class="s3ntrycontrols">
                <span class="path"></span>
                <div class="s3ntryaddfolderwrap">
                    <form id="s3ntryfolderform">
                        <input type="text" max-length="20" name="savefolder" />                        
                        <input type="submit" value="Save" />
                    </form>
                    <button class="s3ntryaddfolder">Add Folder</button>
                </div>
                <button class="s3ntryaddfile">Add File</button>
                <div class="s3ntryswapwrap">
                    <button class="s3ntrymaketiles">&nbsp;</button>
                    <button class="s3ntrymakelist">&nbsp;</button>
                </div>
            </div>
            <div class="s3ntryfiles">
                <div class="s3ntrydisplay"></div>
                <div class="s3ntryuploadwrap">Drag a File here!
                    <div class="s3ntrydrop">Go on, Drop 'em all here!
                    
                    <form class="s3ntrydropform">
                        <input type="file" id="s3ntryfilecatcher" multiple accept="image/*" onchange="handleFiles(this.files)">
                        <label for="s3ntryfilecatcher">Dropping a file will upload it.</label>
                    </form>                    
                    </div>
                </div>
            </div>
        </div>
        `;
        this.wrap.innerHTML=layout;

        let as3ntry = this;

        /*creating a new folder*/
        as3ntry.wrap.querySelector('.s3ntryaddfolder').addEventListener('click',function(){
            /*close file uploader*/
            as3ntry.wrap.querySelector(".s3ntryuploadwrap").classList.remove("on");
            as3ntry.wrap.querySelector('.s3ntryaddfile').classList.remove("on");

            if(!this.classList.contains("on")){
                as3ntry.wrap.querySelector("#s3ntryfolderform").classList.add("on");
                as3ntry.wrap.querySelector('#s3ntryfolderform input[type="text"]').value='';
                as3ntry.wrap.querySelector('#s3ntryfolderform input[type="text"]').focus();
                this.classList.add("on");
            }else{
                as3ntry.wrap.querySelector("#s3ntryfolderform").classList.remove("on");
                as3ntry.wrap.querySelector('#s3ntryfolderform input[type="text"]').blur();
                this.classList.remove("on");
            }
        });
        as3ntry.wrap.querySelector('#s3ntryfolderform input[type="submit"').addEventListener('click',function(e){
            e.preventDefault();
            let txt = as3ntry.wrap.querySelector('#s3ntryfolderform input[type="text"]');
            if(txt.value=='' || !txt.value.match(/^[A-Za-z0-9-]+$/g) || txt.value.length>20){
                let errmsg = '20 Characters allowed: a-z 0-9 -';
                as3ntry.wrap.querySelector("#s3ntryfolderform").setAttribute('data-err',errmsg);
            }else{
                let errmsg = '';
                let newfolder = txt.value.replace(/\s/g,'-').trim().toLowerCase();
                var params = { Bucket: as3ntry.yourbucket, Key: newfolder+'/', ACL: 'public-read', Body:'-' };
                
                var folderKey = as3ntry.currentfolder+encodeURIComponent(newfolder) + "/";
                var donotdeletefile = as3ntry.currentfolder+encodeURIComponent(newfolder) + "/donotdelete.txt";
                as3ntry.s3.headObject({ Key: folderKey }, function(err, data) {
                    if (!err) {
                        errmsg = 'Folder Already Exists';
                    }else{
                        if (err.code !== "NotFound") {
                            errmsg = 'Error: '+err.message;
                        }
                    }
                    if(errmsg==''){
                        as3ntry.s3.putObject({ Key: folderKey }, function(err, data) {
                            if (err) {
                                errmsg = 'Error: '+err.message;
                            }
                            as3ntry.wrap.querySelector("#s3ntryfolderform").setAttribute('data-success','Folder Created!');
                            as3ntry.wrap.querySelector('#s3ntryfolderform input[type="text"]').value='';
                            
                            // Use S3 ManagedUpload class as it supports multipart uploads                            
                            as3ntry.upload = new AWS.S3.ManagedUpload({
                                params: {
                                Bucket: as3ntry.yourbucket,
                                Key: donotdeletefile,
                                Body: ' maybe it needs something'
                                }
                            });

                            var promise = as3ntry.upload.promise();
                            promise.then(
                                function(data){  
                                    as3ntry.listfolders(as3ntry.basepath+'/');  
                                    as3ntry.listfiles(as3ntry.currentfolder);                              
                                },
                                function(err){
                                    as3ntry.wrap.querySelector("#s3ntryfolderform").setAttribute('data-err','Error: '+err.message);
                                }
                            );                        
                        });
                    }else{
                        as3ntry.wrap.querySelector("#s3ntryfolderform").setAttribute('data-err',errmsg);
                    }
                });
            }
        });
        as3ntry.wrap.querySelector('#s3ntryfolderform input[type="text"]').addEventListener('focus',function(){
            as3ntry.wrap.querySelector("#s3ntryfolderform").removeAttribute('data-err');
            as3ntry.wrap.querySelector("#s3ntryfolderform").removeAttribute('data-success');
        });

        /*creating a new file*/
        as3ntry.wrap.querySelector('.s3ntryaddfile').addEventListener('click',function(){
            /*close add folder form*/
            as3ntry.wrap.querySelector("#s3ntryfolderform").classList.remove("on");
            as3ntry.wrap.querySelector('#s3ntryfolderform input[type="text"]').blur();
            as3ntry.wrap.querySelector('.s3ntryaddfolder').classList.remove("on");

            if(!this.classList.contains("on")){
                as3ntry.wrap.querySelector(".s3ntryuploadwrap").classList.add("on");
                this.classList.add("on");
            }else{
                as3ntry.wrap.querySelector(".s3ntryuploadwrap").classList.remove("on");
                this.classList.remove("on");
            }
        });
        /*swapping list and tiles*/
        as3ntry.wrap.querySelector('.s3ntrymakelist').addEventListener('click',function(){
            as3ntry.wrap.querySelector('.s3ntryfiles').classList.add("list");
            as3ntry.wrap.querySelector('.s3ntrymaketiles').classList.remove("on");
            as3ntry.wrap.querySelector('.s3ntrymakelist').classList.add("on");

            /*close add folder form*/
            as3ntry.wrap.querySelector("#s3ntryfolderform").classList.remove("on");
            as3ntry.wrap.querySelector('#s3ntryfolderform input[type="text"]').blur();
            as3ntry.wrap.querySelector('.s3ntryaddfolder').classList.remove("on");

            /*close file uploader*/
            as3ntry.wrap.querySelector(".s3ntryuploadwrap").classList.remove("on");
            as3ntry.wrap.querySelector('.s3ntryaddfile').classList.remove("on");

        });
        as3ntry.wrap.querySelector('.s3ntrymaketiles').addEventListener('click',function(){
            as3ntry.wrap.querySelector('.s3ntryfiles').classList.remove("list");
            as3ntry.wrap.querySelector('.s3ntrymakelist').classList.remove("on");
            as3ntry.wrap.querySelector('.s3ntrymaketiles').classList.add("on");

            /*close add folder form*/
            as3ntry.wrap.querySelector("#s3ntryfolderform").classList.remove("on");
            as3ntry.wrap.querySelector('#s3ntryfolderform input[type="text"]').blur();
            as3ntry.wrap.querySelector('.s3ntryaddfolder').classList.remove("on");

            /*close file uploader*/
            as3ntry.wrap.querySelector(".s3ntryuploadwrap").classList.remove("on");
            as3ntry.wrap.querySelector('.s3ntryaddfile').classList.remove("on");
        });

        var dragTimer;
        as3ntry.wrap.querySelector('.s3ntryuploadwrap').addEventListener('dragover',function(e){
            e.preventDefault();
            e.stopPropagation();
            var dt = e.dataTransfer;
            if (dt.types && (dt.types.indexOf ? dt.types.indexOf('Files') != -1 : dt.types.contains('Files'))) {
                as3ntry.wrap.querySelector(".s3ntrydrop").classList.add("on");
                window.clearTimeout(dragTimer);
            }
        });
        as3ntry.wrap.querySelector('.s3ntryuploadwrap').addEventListener('dragleave', function(e) {
            e.preventDefault();
            e.stopPropagation();
            dragTimer = window.setTimeout(function() {
                as3ntry.wrap.querySelector(".s3ntrydrop").classList.remove("on");
            }, 25);
        });        
        as3ntry.wrap.querySelector('.s3ntryuploadwrap').addEventListener('drop', function(e) {
            e.preventDefault();
            e.stopPropagation();

            /*upload le file*/
            let dt = e.dataTransfer;
            let files = Array.from(dt.files);
            let filesmsg ='';
            this.innerText="Files are being processed.\nPlease Wait...";
            for(let i=0; i<files.length; i++){
                filesmsg = as3ntry.processupload(files[i]);                
            }
        });        
    }

    updatebreadcrumbs(path){
        let as3ntry = this;
        let bcrumbs = as3ntry.wrap.querySelector('.s3ntrycontrols .path');
        bcrumbs.innerHTML='';
        let thepath ='';

        let homespan = document.createElement('span');
        homespan.innerText = "Home/";
        homespan.addEventListener('click',function(){
            as3ntry.listfiles(as3ntry.basepath+'/');
        });
        
        if(path==as3ntry.basepath){
            bcrumbs.append(homespan);    
        }else{            
            bcrumbs.append(homespan);

            let sp = path.split("/");
            let breadcrumbs = '';
            let growpath = '';
            for(let i=0; i<sp.length; i++){
                if(sp[i] != as3ntry.basepath && sp[i]!=''){
                    growpath =  growpath+sp[i]+'/';
                    let curspan = document.createElement('span');
                    curspan.innerText = sp[i]+'/';
                    curspan.setAttribute('data-path',as3ntry.basepath+'/'+growpath);
                    curspan.onclick=function(){
                        as3ntry.listfiles(this.getAttribute('data-path'));
                    };
                    bcrumbs.append(curspan);
                }
            }
        }
        bcrumbs.insertAdjacentHTML('beforeend',' - ('+as3ntry.visualcounter+' files)');
    }

    async processupload(file){
        let as3ntry = this;
        let filefors3;

        let currentmsg ='';

        if(as3ntry.files.sizelimit < file.size){
            currentmsg+='File is too big: '+as3ntry.getsize(file.size) + ' - Limit: '+as3ntry.getsize(as3ntry.files.sizelimit);
        }
        if(as3ntry.files.types.indexOf(file.type) == -1){
            currentmsg+='File type not allowed: '+file.type;
        }

        /*for images*/
        if (file.type.match(/image.*/)) {
            /*need dimensions*/
            let filewidth=0;
            let fileheight=0;

            if(currentmsg==''){
                let s3im = document.createElement("img");                                    

                s3im.onload = () => {
                    filewidth = s3im.width;
                    fileheight = s3im.height;

                    let maxwidth = as3ntry.files.widthlimit;
                    let maxheight = as3ntry.files.heightlimit

                    if(maxwidth != 0 && maxwidth < filewidth){
                        currentmsg+='File width is greater than limit.';                        
                    }                    
                    if(maxheight != 0 && maxheight < fileheight){
                        currentmsg+='File height is greater than limit.';                        
                    }

                    if(currentmsg ==''){
                        let canvas = document.createElement("canvas");
                        let w = s3im.width;
                        let h = s3im.height;                        
                        if (w > h) {
                            if (w > maxwidth) {
                                h *= maxwidth / w;
                                w = maxwidth;
                            }
                        } else {
                            if (h > maxheight) {
                                w *= maxheight / h;
                                h = maxheight;
                            }
                        }
                        canvas.width = w;
                        canvas.height = h;
                        let ctx = canvas.getContext("2d");
                        ctx.drawImage(s3im, 0, 0, w, h);
                    }
                }
               s3im.src = await window.URL.createObjectURL(file);
               filefors3 = await as3ntry.srctofile(s3im.src,file.name, file.type);
            }
        }else{ /*file is not an image*/        
            filefors3 = file;
        }                        

        if(currentmsg==""){
            let cleanname = file.name.replace(/[^a-z0-9\.]/gi, '_').toLowerCase();

            var objKey = as3ntry.currentfolder + cleanname;
            var params = {
                Key: objKey,
                ContentType: filefors3.type,
                Body: filefors3
            };

            let fileexists =  as3ntry.s3.headObject({Key:objKey}).promise();                       
            fileexists.then(function(data) {
                if(confirm("A file with the name "+cleanname+" exists in this folder.\nDo you want to overwrite it?")){
                    as3ntry.s3.putObject(params, function(err, data) {
                        if (err) {
                            currentmsg = "ERROR: "+cleanname +"--" + err;
                            as3ntry.wrap.querySelector('.s3ntryuploadwrap').innerText = currentmsg;
                        } else {
                            currentmsg = "File: "+cleanname+", Uploaded.";
                            as3ntry.wrap.querySelector('.s3ntryuploadwrap').innerText = as3ntry.wrap.querySelector('.s3ntryuploadwrap').innerText + "\n"+currentmsg;
                            as3ntry.listfiles(as3ntry.currentfolder);
                        }
                    });
                }else{
                    currentmsg = "Note: "+cleanname +" was not uploaded";
                    as3ntry.wrap.querySelector('.s3ntryuploadwrap').innerText = currentmsg;
                }                
            }).catch(function(err){
                if(err.code=='NotFound'){
                    as3ntry.s3.putObject(params, function(err, data) {
                        if (err) {
                            currentmsg = "ERROR: "+cleanname +"--" + err;
                            as3ntry.wrap.querySelector('.s3ntryuploadwrap').innerText = currentmsg;
                        } else {
                            currentmsg = "File: "+cleanname+", Uploaded.";
                            as3ntry.wrap.querySelector('.s3ntryuploadwrap').innerText = as3ntry.wrap.querySelector('.s3ntryuploadwrap').innerText + "\n"+currentmsg;
                            as3ntry.listfiles(as3ntry.currentfolder);
                        }
                    });
                }else{
                    alert(err);
                }
            });
        }else{
            as3ntry.wrap.querySelector('.s3ntryuploadwrap').innerText = "ERROR: "+currentmsg;
        }
        
        return currentmsg;
    }

    loadstyling(){
        if(!document.getElementById("genstyles3ntry")){
            let styling =`
                #wrapolays3ntry{display:none;}
                #wrapolays3ntry.on{display:block; position:fixed; top:0; left:0; width:100%; height:100%; z-index:33333; opacity:0.8; background:#333;}
            `;
            let genstyle = document.createElement('style');
            genstyle.setAttribute('id','genstyles3ntry');
            genstyle.innerHTML=styling;
            document.body.append(genstyle);
        }

        let custstyling= `
            #wrap${this.newid}{display:none; font-family:Arial;}
            #wrap${this.newid} *{box-sizing:border-box;}
            #wrap${this.newid}.on{display:flex; flex-wrap:wrap; justify-content:space-between; align-content:baseline; position:absolute; top:0; left:0; bottom:0; right:0; margin:auto; width:80vw; height:90vh; background:#fff; border:10px solid #001f3f; border-top:0; z-index:33334;}

            .s3ntryhead{width:100%; height:40px; line-height:40px; padding:0 6px; background:#001f3f; color:#fff; font-size:22px;}
            .s3ntryfolders{width:200px; background:#0074D9; height:calc(100% - 40px); overflow:auto; font-size:12px; padding:6px;}
            .s3ntryfolders h2{margin:-6px; padding:0 6px; height:35px; line-height:35px; color:#fff;}
            .s3ntryfolders ul{padding:0; margin:0; list-style-type:none;}
            .s3ntryfolders button{ display:block; border:0; background:none; width:calc(100% - 12px); margin:6px; padding:6px 6px 6px 0; border-radius:8px; text-align:left; color:#fff; text-transform:capitalize; cursor:pointer; transition:background 0.2s;}
            .s3ntryfolders button:hover{ background:#344863; }

            .s3ntryfilewrap{width:calc(100% - 200px); height:calc(100% - 40px); background:#fff;overflow:hidden; font-size:12px;}
            .s3ntrycontrols{position:relative; background:#344863; height:35px; }
            .s3ntrycontrols .path{font-size:20px; color:#fff; margin:0 20px; line-height:35px; vertical-align:top;}
            .s3ntrycontrols .path span{margin-right:2px;}
            .s3ntrycontrols .path span:hover{cursor:pointer; color:#0074D9; text-decoration:underline;}
            .s3ntrycontrols .path span:last-child{pointer-events:none;}

            .s3ntrycontrols button{background:#001f3f;color:#fff; width:100px; height:35px; line-height:35px; border:0; margin:0 12px; transition:all 0.2s; cursor:pointer; vertical-align:top;}
            .s3ntrycontrols button:hover{background:#0074D9;}

            .s3ntryaddfolderwrap{display:inline-block;}            
            #s3ntryfolderform{ position:relative; height:35px; white-space:nowrap; max-width:0; overflow:hidden; transition:all 0.6s; display:inline-block;}
            #s3ntryfolderform.on{width:auto; max-width:300px;}
            #s3ntryfolderform input[type="text"]{ width:200px; border:1px solid #ccc; height:33px; line-height:32px;}
            #s3ntryfolderform input[type="submit"]{background:#001f3f;color:#fff; width:60px; height:35px; line-height:35px; border:0; margin:0 12px 0 0; transition:all 0.2s; cursor:pointer;}
            #s3ntryfolderform input[type="submit"]:hover{background:#0074D9; }
            #s3ntryfolderform[data-err]:before{content:attr(data-err); position:absolute; left:2px; bottom:1px; width:200px; text-align:center; font-size:11px; color:#f00;}
            #s3ntryfolderform[data-success]:before{content:attr(data-success); position:absolute; left:2px; bottom:1px; width:200px; text-align:center; font-size:11px; color:green;}
            
            .s3ntryaddfolder.on{position:relative;}
            .s3ntryaddfolder.on:before{content:"Close"; position:absolute; top:0; left:0; width:100%; height:100%; background:#999; z-index:1;} 
            .s3ntryaddfolder.on:hover:before{background:#444;}
            
            .s3ntryaddfile.on{position:relative;}
            .s3ntryaddfile.on:before{content:"Close"; position:absolute; top:0; left:0; width:100%; height:100%; background:#999; z-index:1;} 
            .s3ntryaddfile.on:hover:before{background:#444;}

            .s3ntryswapwrap{position:absolute;top:0; right:0;}
            .s3ntryswapwrap button{position:relative; width:34px; height:34px; margin:0;}
            .s3ntrymaketiles:before{content:' '; position:absolute; top:calc(50% - 1px); left:2px; width:calc(100% - 4px); height:2px; background:#333;}
            .s3ntrymaketiles:after{content:' '; position:absolute; left:calc(50% - 1px); top:2px; width:2px; height:calc(100% - 4px); background:#333;}
            .s3ntrymakelist:before{content:' '; position:absolute; top:calc(33% - 1px); left:2px; width:calc(100% - 4px); height:2px; background:#333;}
            .s3ntrymakelist:after{content:' '; position:absolute; top:calc(67% - 1px); left:2px; width:calc(100% - 4px); height:2px; background:#333;}
            .s3ntryswapwrap button.on{background: #0074D9;}
            .s3ntryswapwrap button.on:before,.s3ntryswapwrap button:hover:before{background:#fff;}
            .s3ntryswapwrap button.on:after,.s3ntryswapwrap button:hover:after{background:#fff;}
            
            .s3ntryfiles{position:relative; padding:20px; height:calc(100% - 35px); overflow:auto;}
            .s3ntryfileswrap{display:flex; flex-wrap:wrap; justify-content:flex-start;}
            .s3ntryfileswrap div{position:relative; display:flex; justify-content:center; height:150px; width:150px; margin:12px 8px; text-align:center;}
            .s3ntryfileswrap div.folder{position:relative; align-items:center; align-self:center; overflow:hidden; box-shadow:1px 1px 5px rgba(0,31,63, 0.69); border-radius:8px; padding:20px; margin:12px 8px 12px 8px; color:#fff; text-transform:capitalize; background:#344863; box-shadow:1px 1px 5px rgba(0,31,63, 0.69); cursor:pointer; }
            .s3ntryfileswrap div.folder:hover{box-shadow:3px 3px 8px rgba(0,31,63, 1); background:#aaa;}
            .s3ntryfileswrap div.im img{align-self:center; max-width:100%; max-height:100%; border:1px solid #ddd; width:auto !important; height:auto !important; cursor:pointer;}
            .s3ntryfileswrap div.im{box-shadow:1px 1px 5px rgba(0,31,63, 0.69); border-radius:8px; overflow:hidden;}
            .s3ntryfileswrap div.im:hover{box-shadow:3px 3px 8px rgba(0,31,63, 1); background:#ccc;}
            .s3ntryfileswrap div.notim{box-shadow:1px 1px 5px rgba(0,31,63, 0.69); border-radius:8px; overflow:hidden; text-align:center; background:#001f3f;}
            .s3ntryfileswrap div.notim:before{content:attr(data-type); font-size:20px; text-align:center; position:absolute; top:10px; left:0; line-height:40px; width:100%; color:#fff; font-weight:bold; text-transform:uppercase;}
            .s3ntryfileswrap div.notim:hover{box-shadow:3px 3px 8px rgba(0,31,63, 1); background:#ccc;}
            .s3ntryfileswrap div.notim span{align-self:center; color:#fff; margin:40px 10px 0 10px; width:calc(100% - 20px); word-wrap:break-word;}
            .s3ntryfileswrap button,.s3ntryfileswrap .s3ntrydownload{display:none; position:absolute; border:0; background:#001f3f; color:#fff; font-size:11px; justify-content:center; padding:2px 6px; cursor:pointer;}
            .s3ntryfileswrap div:hover button,.s3ntryfileswrap div:hover .s3ntrydownload{display:flex;}
            .s3ntryfileswrap button:hover,.s3ntryfileswrap .s3ntrydownload:hover{background:#0074D9;}
            .s3ntryfileswrap .s3ntryinsert{top:0; left:0;}
            .s3ntryfileswrap .s3ntrydownload{bottom:0; right:0; }
            .s3ntryfileswrap .s3ntrydelete{top:0; right:0;}
            .s3ntryfileswrap .s3ntryfolderdelete{top:0; right:0; z-index:1;}

            .s3ntryfiles.list .s3ntrydisplay div{display:block; border-radius:0; box-shadow:none; width:100%; height:48px; padding:4px 8px; text-align:left; color:#001f3f;}
            .s3ntryfiles.list .s3ntryfileswrap div{}
            .s3ntryfiles.list .s3ntryfileswrap div button{ font-size:12px; padding:8px 0; width:80px; }
            .s3ntryfiles.list .s3ntryfileswrap div button.s3ntryinsert{right:190px; left:auto; top:0; bottom:0;}
            .s3ntryfiles.list .s3ntryfileswrap div .s3ntrydownload{ position:absolute; right:100px; top:0; bottom:0;}
            .s3ntryfiles.list .s3ntryfileswrap div button.s3ntrydelete{ right:10px; top:0; bottom:0;}
            .s3ntryfiles.list .s3ntryfileswrap div:before{content:attr(data-name); position:absolute; top:10px; left:150px; height:15px; line-height:15px; font-size:12px; font-weight:bold; text-transform:uppercase;}
            .s3ntryfiles.list .s3ntryfileswrap div.im{background:#ccc;}
            .s3ntryfiles.list .s3ntryfileswrap div.notim{background:#ccc;}
            .s3ntryfiles.list .s3ntryfileswrap div.notim:before{content:attr(data-name) " - " attr(data-type); color:#001f3f; text-align:left; width:auto;}
            .s3ntryfiles.list .s3ntryfileswrap div:after{content:attr(data-size); position:absolute; top:25px; left:150px; height:15px; line-height:15px; font-size:12px;}
            .s3ntryfiles.list .s3ntryfileswrap div.folder{width:200px; display:inline-flex; align-items:center; color:#fff; font-weight:bold; text-align:left;}
            .s3ntryfiles.list .s3ntryfileswrap .s3ntrydownload{align-items:center; width:80px;}
            
            .s3ntryfiles.list .s3ntryfileswrap div.im img{max-width:120px; max-height:100%;}

            .s3ntryuploadwrap{display:none; position:absolute; top:0; left:0; width:100%; height:100%; padding-top:40px; transition:all 0.2s; font-size:25px; text-align:center; line-height:40px; color:#001f3f; z-index:1; }
            .s3ntryuploadwrap:before{content:' '; position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(200,200,200,0.8); z-index:-1;}
            .s3ntryuploadwrap.on{display:block;}
            .s3ntrydrop{display:none; position:absolute; top:0; left:0; bottom:0; right:0; margin:auto; width:80%; height:80%; background:#999; border:2px dashed #000; font-size:22px; text-align:center; line-height:200px; color:#fff; transition:all 0.2s; z-index:1;}
            .s3ntrydrop.on{display:block;}
            .s3ntrydropform{position:absolute; top:0; left:0; width:100%; height:50px; line-height:50px; text-align:center;}
            .s3ntrydropform label{text-align:center; color:#0074D9; font-size:16px; }
            #s3ntryfilecatcher{display:none;}
        `;
        if(!document.getElementById('custstyle'+this.newid)){
            let custstyle = document.createElement('style');
            custstyle.setAttribute('id','custstyle'+this.newid);
            custstyle.innerHTML=custstyling;
            document.body.append(custstyle);
        }        
    }

    getsize(bytes, decimals = 2) {
        if (bytes === 0){ return '0 Bytes';} 
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];    
        const i = Math.floor(Math.log(bytes) / Math.log(k));    
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    async srctofile(src, fileName, mimeType){
        return await (fetch(src)
            .then(function(res){return res.arrayBuffer();})
            .then(function(buf){return new File([buf], fileName, {type:mimeType});})
        );
    }

    async datauritoblob(dataURI) {
        var byteString = dataURI.split(',')[1];
        var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
        var ab = new ArrayBuffer(byteString.length);
        var ia = new Uint8Array(ab);
        for (var i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        var blob = new Blob([ab], {type: mimeString});
        return blob;
    }

    fileevents(e,as3ntry){
        if(e.target.classList.contains('s3ntryinsert')){
            as3ntry.insertfile(e.target,as3ntry);
        }
        if(e.target.classList.contains('s3ntrydownload') && e.target.classList.contains('btn')){
            as3ntry.downloadfile(e.target,as3ntry);
        }
        if(e.target.classList.contains('s3ntrydelete')){
            if(confirm("Are you sure you want to delete this file?")){
                as3ntry.removefile(e.target.parentNode.getAttribute('data-path'),as3ntry);
            }
        }
    }

    insertfile(key,as3ntry){
        as3ntry.target.value = key.parentNode.getAttribute('data-path');
        as3ntry.destroy();
    }

    async downloadfile(key,as3ntry){
        let parent = key.parentNode;
        let type = parent.getAttribute('data-mime');
        if(type.indexOf("image/") > -1){
            let blob =  await as3ntry.datauritoblob(parent.querySelector("img").src);
            let a = document.createElement("a");
            let tempid = Math.random()*10000;
            a.id="tempa_"+tempid;
            a.style = "display: none";
            a.href = blob;
            a.download = parent.getAttribute('data-name');
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(blob); 
            document.getElementById(a.id).remove();
        }else{
            let filedata =  as3ntry.s3.getObject({Key: parent.getAttribute('data-path')}).promise();                        
            filedata.then(function(data) {

                let b64Data = data.Body.toString('base64');
                let byteCharacters = atob(b64Data);
                let byteArrays = [];
                for (let offset = 0; offset < byteCharacters.length; offset += 512) {
                    let slice = byteCharacters.slice(offset, offset + 512);
                    let byteNumbers = new Array(slice.length);
                    for (let i = 0; i < slice.length; i++) {
                        byteNumbers[i] = slice.charCodeAt(i);
                    }
                    let byteArray = new Uint8Array(byteNumbers);
                    byteArrays.push(byteArray);
                }
                let blob = new Blob(byteArrays, {type: data.ContentType});

                let a = document.createElement("a");
                let tempid = Math.random()*10000;
                a.id="tempa_"+tempid;
                a.style = "display: none";
                a.href = URL.createObjectURL(blob);
                a.download = parent.getAttribute('data-name');
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(blob); 
                document.getElementById(a.id).remove();
            });
        }
    }

    async removefile(filename,as3ntry){
        var objKey = filename;
        var params = {
            Key: objKey
        };

        let removeObjectPromise = as3ntry.s3.deleteObject(params).promise();
        await removeObjectPromise.then(function(data) {
            as3ntry.listfiles(as3ntry.currentfolder);
        }).catch(function(err) {
            console.log(err);
        });
    }

    async removefolder(folder,as3ntry){
        var params = {
            Prefix: folder
        };
        let getchildobjects = as3ntry.s3.listObjects(params).promise();

        await getchildobjects.then(function(data) {
            if(data.Contents.length == 0){
                    /*has no files, should auto-remove*/
            }else{
                params = {};
                params.Delete = {Objects:[]};
            
                data.Contents.forEach(function(content) {
                  params.Delete.Objects.push({Key: content.Key});
                });

                let deleteobjects = as3ntry.s3.deleteObjects(params).promise();
                deleteobjects.then(function(data) {
                    if(data.Deleted.length == 1000){removefolder(folder,as3ntry);}
                }).then(function(){
                    as3ntry.listfiles(as3ntry.currentfolder); 
                    as3ntry.listfolders(as3ntry.basepath+'/');
                }).catch(function(err){
                    console.log(err);
                });                
            }                        
        }).catch(function(err) {
            console.log(err);
        }); 
        
    }

    destroy(){
        document.getElementById('wrap'+this.newid).remove();
        document.getElementById('wrapolays3ntry').classList.remove("on");
    }

}