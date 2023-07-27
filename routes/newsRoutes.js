const express = require("express");
const { createNewsArticle, getNewsArticle, uploadImage, modifyNewsArticle, getAllNewsArticle, deleteNewsArticle, getNewsArticlesByCategory, getTrendingNewsArticles, getNewsArticles, search, ytVideosData } = require("../controllers/newsController");
const validateToken = require("../middlewares/validateTokenHandler");
const router = express.Router();
const path = require('path');
const multer = require('multer');

//const imageStoragePath = path.join(__dirname, 'imageUploads');
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const destinationPath = path.join(__dirname, 'imageUploads');
        const absolutePath = path.join('D:', 'Node', 'MyImages');

      cb(null, absolutePath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const filename = file.originalname + '-' + uniqueSuffix + ext;
        const imageUrl = 'http://localhost:8085/' + filename; // Replace 'your-domain.com' with your actual domain
        cb(null, filename);
        req.imageUrl = imageUrl; // Save the URL in the request object for later use
      }
  });
  
  const upload = multer({ storage });
//const upload = multer({ dest: 'uploads/' }); // Specify the destination folder for storing uploaded files



router.get("/" ,(req,res)=>{
    res.send("Hello World");
});

router.post("/create",validateToken,upload.single('image'),createNewsArticle);
router.post("/upload",validateToken,upload.single('image'),uploadImage);
router.post("/modify/:id",validateToken, upload.single('image'), modifyNewsArticle);
router.delete("/delete/:slug",validateToken, deleteNewsArticle);


router.get("/get/:slug",getNewsArticle);
router.get("/get-All", getAllNewsArticle);
router.get("/get-News-By-Category/:category",getNewsArticlesByCategory);
router.get("/get-Trending-News",getTrendingNewsArticles);
router.get("/getNews",getNewsArticles);
router.get("/search",search);
router.get("/yt",ytVideosData);

module.exports=router;