const express = require('express');
const router = express.Router();
const {Video} = require("../models/Video");
const {auth} = require("../middleware/auth");
const multer = require('multer');

var ffmpeg = require('fluent-ffmpeg');

//storage multer config
let storage = multer.diskStorage({
    destination: (req,file,cb)=>{
        cb(null,"uploads/");
    },
    filename: (req,file,cb)=>{
        cb(null,`${Date.now()}_${file.originalname}`);
    },
    fileFilter: (req,file,cb)=>{
        const ext = path.extname(file.originalname)
        if(ext !== '.mp4'){
            return cb(res.status(400).end('only mp4 is allowed'),false)
        }
        cb(null,true)
    }
});
const upload = multer({storage: storage}).single('file');


router.post('/uploadfiles', (req,res)=>{
    //비디오를 서버에 저장
    upload(req,res,err =>{
        if(err){
            return res.json({success: false, err})
        }
        return res.json({success: true, url: res.req.file.path, filename: res.req.file.filename})
    })
})

router.post('/thumbnail',(req,res)=>{

    let filePath = ""
    let fileDuration = ""
    
    //비디오 runtime 가져오기
    ffmpeg.ffprobe(req.body.url, function(err,metadata){
        fileDuration=metadata.format.duration
    })

    //썸네일 생성
    ffmpeg(req.body.url)
    .on('filenames',function(filenames){
        console.log('Will generate ' + filenames.join(', '))
        console.log(filenames)

        filePath = 'uploads/thumnails/' + filenames[0]
    })
    .on('end',function(){
        console.log('Screenshots taken');
        return res.json({success: true, url: filePath, fileDuration: fileDuration})
    })
    .on('error', function(err){
        console.error(err);
        return res.json({success:false,err});
    })
    .screenshots({
        count:3,
        folder: 'uploads/thumnails',
        size: '320x240',
        //%b: 확장자를 제외한 파일 이름
        filename:'thumbnail-%b.png'
    })
})

router.post('/uploadVideo', (req,res)=>{
    //비디오 정보 저장
    const video = new Video(req.body)
    
    //몽고 DB 메서드로 저장
    video.save((err, doc)=>{
        if(err) return res.json({success:false, err})
        res.status(200).json({success: true})
    })
})

router.get('/getVideos', (req,res)=>{
    //비디오를 DB에서 가져와서 클라이언트로 전송
    Video.find()    //Video collection 안에 있는 모든 video를 가져옴
    .populate('writer') //populate를 해야 모든 writer 정보를 가져올 수 있음, 안하면 writer의 id정보만 가져옴
    .exec((err, videos)=>{
        if(err) return res.status(400).send(err);
        res.status(200).json({success:true, videos})
    })
})

module.exports = router;
