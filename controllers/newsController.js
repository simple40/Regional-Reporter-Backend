const asyncHandler = require("express-async-handler");
const News = require("../models/newsModel");
const slugify = require("slugify");
const transliteration = require('transliteration');
const fs = require('fs');
const sharp = require('sharp');
const path = require('path');
const { constants } = require("../constants");
const youtube = require("../config/ytApiConnection");
const Headline = require("../models/headlineModel");
const YoutubeData = require('../models/youtubeData.');
const Carousel = require("../models/carouselModel");
const Feedback = require("../models/feedbackModel");
const transporter = require("../config/emailConfig");


const createNewsArticle = asyncHandler(async (req, res) => {
  //console.log(req.body);
  const imageFile = req.file;
  const newsData = req.body;
  const { title, content, category, ytVideoId, authorDetails} = newsData;
  if (!title, !content, !category, !imageFile) {
    res.status(400);
    throw new Error("All fields are mandatory!");
  }
  console.log(title);
  const imageUrl = req.imageUrl;
  const slug1 = slugify(title, { lower: true, strict: true, locale: 'hi-IN', });
  console.log(slug1);
  const slug = transliteration.slugify(title, {
    lowercase: true,
    separator: '-',
  });
  compressImage(imageFile.path);
  const newsArticle = await News.create({
    title,
    content,
    slug,
    imageUrl,
    category,
    ytVideoId,
    authorDetails
  });

  if (newsArticle) {
    res.status(201).json({ newsArticle });
  }
  else {
    res.status(400);
    throw new Error("data not valid");
  }

});

const getNewsArticle = asyncHandler(async (req, res) => {
  const slug = req.params.slug;
  const newsArticle = await News.findOneAndUpdate(
    { slug },
    { $inc: { views: 1 } },
    { new: true }
  );
  
  res.status(200).json(newsArticle)
});

const uploadImage = asyncHandler(async (req, res) => {
  const imageUrl = req.imageUrl;
  const imageFile = req.file;
  const result = await compressImage(imageFile.path);
  const oldImageUrl = 'http://localhost:8085/IMG_20190426_234132.jpg-1691218593590-114501414.jpg';
  const OldImageName = oldImageUrl.replace('http://localhost:8085/', '');
  const imagePath = path.join('D:/Node/MyImages', OldImageName);
  fs.unlinkSync(imagePath);
  console.log("successfully compressed")
  res.status(200);
  res.status(200).json(imageUrl);
})

const modifyNewsArticle = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { title, content, category, ytVideoId, authorDetails} = req.body;
  const imageFile = req.file;
  const modifiedData = {};
  const newsArticle = await News.findById(id);
  if (!newsArticle) {
    res.status(404).json({ message: "News Article not found!" });
    return;
  }
   const slug = newsArticle.slug;
  if (title) {
    modifiedData.title = title;
    modifiedData.slug = transliteration.slugify(title, {
      lowercase: true,
      separator: '-',
    });
    const headline = await Headline.findOne({slug})
    const carousel =await Carousel.findOne({slug})
    if(headline){
      const head =await Headline.findOneAndUpdate({slug},{slug : modifiedData.slug},{new : true});
      console.log(head.slug);
    }
    if(carousel){
      const car = await Carousel.findOneAndUpdate({slug},{slug : modifiedData.slug},{new : true});
      console.log(car.slug);
    }  
  }
  if (content) {
    modifiedData.content = content;
  }
  if (category) {
    modifiedData.category = category;
  }
  if (imageFile) {
    await compressImage(imageFile.path);
    const oldImageUrl = newsArticle.imageUrl;
    const oldImageName = oldImageUrl.replace('http://localhost:8085/', '');
    const oldImagePath = path.join('D:/Node/MyImages', oldImageName);
    fs.unlinkSync(oldImagePath);
    modifiedData.imageUrl = req.imageUrl;
  }
  if(ytVideoId){
    modifiedData.ytVideoId = ytVideoId;
  }
  if(authorDetails){
    modifiedData.authorDetails = authorDetails;
  }
  const modifiedNewsArticle = await News.findByIdAndUpdate(
    id,
    modifiedData,
    { new: true }
  );
  res.status(200).json({ message: 'News article modified successfully', news: modifiedNewsArticle });
});

const deleteNewsArticle = asyncHandler(async (req, res) => {

  const { slug } = req.params;
  const newsData = await News.findOne({ slug });
  const imageUrl = newsData.imageUrl;
  const deletedNewsArticle = await News.findOneAndDelete({ slug });
  const deletedHeadline = await Headline.findOneAndDelete({slug});
  const deleteCarousel = await Carousel.findOneAndDelete({slug});
  if (!deletedNewsArticle) {
    return res.status(404).json({ message: 'News article not found' });
  }
  const imageName = imageUrl.replace('http://localhost:8085/', '');
  
  try{
    const imagePath = path.join('D:/Node/MyImages', imageName);
    console.log(imagePath);
    fs.unlinkSync(imagePath);
  }
  catch(error){
    console.log(error);
  }
  res.status(200).json({ message: 'News article deleted successfully' });
});

const getAllNewsArticle = asyncHandler(async (req, res) => {

  const newsArticles = await News.find({});
  if (!newsArticles) {
    res.status(400);
    throw new Error("Something went wrong");
  }
  res.status(200).json(newsArticles);

});

const getNewsArticlesByCategory = asyncHandler(async (req, res) => {

  const { category } = req.params;
  const newsArticles = await News.find({ category });
  if (!newsArticles) {
    res.status(404);
    throw new Error("Something went wrong. You Entered wrong category");
  }
  res.status(200).json(newsArticles);

});

const getTrendingNewsArticles = asyncHandler(async (req, res) => {

  const currentDate = new Date();

  // Calculate the start date of the time frame
  const startDate = new Date(currentDate.getTime() - constants.TIME_FRAME);

  // Query the database for news articles within the time frame
  const trendingNews = await News.find({
    createdAt: { $gte: startDate, $lte: currentDate }
  }).sort({ views: -1 }).limit(6); // Limiting to top 6 trending news

  if (!trendingNews) {
    res.status(404);
    throw new Error("News Articles not found!");
  }

  trendingNews.forEach(newsArticle => {
    console.log(newsArticle.title);
  });

  // Return the trending news
  res.status(200).json(trendingNews);

});

const getPopularNews = asyncHandler(async (req, res) => {
  const pupularNews = await News.find().sort({ views: -1 }).limit(8);
  if (!pupularNews) {
    res.status(404);
    throw new Error("News Articles not found!");
  }
  res.status(200).json(pupularNews);
});

const getNewsArticles = asyncHandler(async (req, res) => {

  const { category, sortBy = 'date', sortOrder = 'desc' } = req.query;
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.pageSize) || 10;
  const skip = (page - 1) * pageSize;
  let query = News.find();

  if (category) {
    query = query.where('category').equals(category);
  }
  let sortingOption = {};
  if (sortBy === 'date') {
    sortingOption.createdAt = sortOrder === 'asc' ? 1 : -1;
  }
  else if (sortBy === 'views') {
    sortingOption.views = sortOrder === 'asc' ? 1 : -1;
  }


  //query = query.skip(skip).limit(pageSize);
  query = query.sort(sortingOption);

  const newsArticles = await query.exec();
  if (!newsArticles) {
    res.status(404);
    throw new Error("News Articles not found!");
  }

  const paginatedNewsArticles = newsArticles.slice(skip, skip + pageSize);

  const totalItems = newsArticles.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  paginatedNewsArticles.forEach(newsArticle => {
    console.log(newsArticle.title);
  });

  res.status(200).json({
    page,
    pageSize,
    totalPages,
    totalItems,
    paginatedNewsArticles
  });

});

const search = asyncHandler(async (req, res) => {

  const searchQuery = req.query.q;
  const searchResults = await News.find(
    { $text: { $search: searchQuery } }
  );
  if (!searchResults) {
    res.status(404);
    throw new Error("No result found!");
  }
  searchResults.forEach(newsArticle => {
    console.log(newsArticle.title);
  });
  res.status(200).json(searchResults);

});

const ytVideosData = asyncHandler(async (req, res) => {

  // const channelId = "UCeH4vLgigCddC0ObtQ4nmyQ"; // Replace with your actual channel ID
  // const maxResults = 10; // Number of videos to fetch

  // const params = {
  //   part: "snippet",
  //   channelId: channelId,
  //   order: "viewCount",
  //   maxResults: maxResults,
  // };

  // youtube.search.list(params, (err, response) => {
  //   if (err) {
  //     console.error("Error fetching videos:", err);
  //     return res.status(500).json({ error: "Error fetching videos" });
  //   } else {
  //     const videos = response.data.items;
  //     const videoList = videos.map((video) => ({
  //       videoId: video.id.videoId,
  //       title: video.snippet.title,
  //       thumbnail: video.snippet.thumbnails.default.url,
  //     }));
  //     return res.status(200).json(videoList);
  //   }
  // });

  const videoList = await YoutubeData.find({});
  if (videoList) {
    res.status(200).json(videoList);
  }
  else {
    console.log("error");
    throw new Error("error getting videos data");  
  }
});

const insertOrUpdateHeadline = asyncHandler(async (req, res) => {
  const { slugs } = req.body;

  try {
    await Headline.deleteMany({});
    const maxHeadlines = 6;
    const headlineDocs = slugs.slice(0, maxHeadlines).map((slug) => ({ slug }));
    await Headline.insertMany(headlineDocs);
    res.json({ message: 'Headlines inserted/updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

const getHeadlines = asyncHandler(async (req, res) => {
  const headlines = await Headline.find({}, 'slug');

  if (!headlines) {
    throw new Error("No headlines found");
    res.status(404).json("No headlines found");
  }
  const slugs = headlines.map((headline) => headline.slug);
  const news = await News.find({ slug: { $in: slugs } });
  const orderedNews = slugs.map((slug) => news.find((article) => article.slug === slug));
  res.status(200).json(orderedNews);
});

const getHeadlinesSlug = asyncHandler(async(req,res)=>{
  const headlines = await Headline.find({},'slug');
  if(!headlines){
    throw new Error("No headlines found");
  }
  const slugs = headlines.map((headline)=>headline.slug);
  res.status(200).json(slugs);
});

const insertOrUpdateCarousel = asyncHandler(async (req, res) => {
  const { slugs } = req.body;

  try {
    await Carousel.deleteMany({});
    const maxCarousel = 3;
    const CarouselDocs = slugs.slice(0, maxCarousel).map((slug) => ({ slug }));
    await Carousel.insertMany(CarouselDocs);
    res.json({ message: 'Carousel inserted/updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

const getCarousel = asyncHandler(async (req, res) => {
  const carousel = await Carousel.find({}, 'slug');

  if (!carousel) {
    throw new Error("No Carousel found");
    res.status(404).json("No headlines found");
  }
  const slugs = carousel.map((carousel) => carousel.slug);
  const news = await News.find({ slug: { $in: slugs } });
  const orderedNews = slugs.map((slug) => news.find((article) => article.slug === slug));
  res.status(200).json(orderedNews);
});

const getCarouselSlug = asyncHandler(async(req,res)=>{
  const carousel = await Carousel.find({},'slug');
  if(!carousel){
    throw new Error("No carousel found");
  }
  const slugs = carousel.map((carousel)=>carousel.slug);
  res.status(200).json(slugs);
});

const getRelatedNews = asyncHandler(async(req, res) =>{
  const currentArticleSlug = req.params.slug;
  const currentArticle = await News.findOne({slug : currentArticleSlug});
  console.log(currentArticle);
  const fiveDaysAgo = new Date();
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

  const recentRandomNews = await News.aggregate([
    {$match : {createdAt : {$gte : fiveDaysAgo}, _id: {$ne : currentArticle._id},category: {$nin: [currentArticle.category]}} },
    {$sample: {size : 2}}
  ]);
  console.log(recentRandomNews);
  const categoryRandomNews = await News.aggregate([
    {$match:{category: currentArticle.category, _id: {$ne : currentArticle._id}}},
    {$sample:{size : 2}}
  ]);
  console.log(categoryRandomNews);
  const relatedNews = [...recentRandomNews, ...categoryRandomNews];
  res.status(200).json(relatedNews);
});

const feedBack = asyncHandler(async(req, res)=>{
  console.log(process.env.Gmail);
  console.log(process.env.AdminGmail);
  console.log(process.env.password);
  const {email,message} = req.body;
  if(!email, !message){
    res.status(400);
    throw new Error("All fields are mandatory!");
  }
  const feedBack = await Feedback.create({
    email,
    message
  });
  if (feedBack) {
    const mailOptions = {
      from: process.env.Gmail,
      to: process.env.AdminGmail, // Admin's email address
      subject: 'New Feedback Received',
      text: `New feedback received from ${email}: ${message}`,
    };
    
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('Error sending email:', error);
      } else {
        console.log('Email sent:', info.response);
      }
    });
    
    res.status(201).json({ feedBack });
    
  }
  else {
    console.error('Error submitting form:', error);
    res.status(500).send('An error occurred while submitting the form.');
  }
})

const compressImage = asyncHandler(async (imagePath) => {
  try {
    console.log(imagePath);
    const { width: originalWidth, height: originalHeight } = await sharp(imagePath).metadata();
    // Set a threshold size for compression (e.g., 800 pixels)
    const minSizeForCompression = 1200;
    // Check if either width or height is smaller than the threshold
    if (originalWidth < minSizeForCompression || originalHeight < minSizeForCompression) {
      console.log("Image is too small for resize");
      const compressedImage = await sharp(imagePath).jpeg({ quality: 70 }).toBuffer();
      fs.writeFileSync(imagePath, compressedImage);
      console.log('compression successfull');
      return ("successfully compressed");
    }
    const compressedImage = await sharp(imagePath).resize({width : 1200, fit: 'inside'}).jpeg({ quality: 70 }).toBuffer();
    // Overwrite the original file with the compressed version
    fs.writeFileSync(imagePath, compressedImage);
    console.log("compression successfull");
    return ("successfully compressed");
  } catch (err) {
    // Handle the error
    console.log(err);
    throw new Error("Image compression failed");
  }
})



module.exports = { createNewsArticle, getNewsArticle, uploadImage, modifyNewsArticle, deleteNewsArticle, getAllNewsArticle, getNewsArticlesByCategory, getTrendingNewsArticles, getPopularNews, getNewsArticles, search, ytVideosData, insertOrUpdateHeadline, getHeadlines, getHeadlinesSlug, insertOrUpdateCarousel, getCarousel, getCarouselSlug ,getRelatedNews, feedBack };