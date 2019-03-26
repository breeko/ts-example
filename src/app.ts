import AWS = require('aws-sdk');

const albumBucketName = 'spypy-faces';
const bucketRegion = 'us-east-1';
const IdentityPoolId = 'us-east-1:908647e4-7462-467c-a4dd-eaf68ae1181f';

AWS.config.update({
  region: bucketRegion,
  credentials: new AWS.CognitoIdentityCredentials({
    IdentityPoolId: IdentityPoolId
  })
});
 
const s3 = new AWS.S3({
  apiVersion: '2006-03-01',
  params: {Bucket: albumBucketName}
});

function getHtml(template: Array<string>) {
    return template.join('\n');
 }

function listAlbums() {
    s3.listObjects({Delimiter: "/", Bucket: albumBucketName},function(err, data) {
      if (err) {
        return alert('There was an error listing your albums: ' + err.message);
      } else {
        const albums = data.CommonPrefixes.map(function(commonPrefix) {
          const prefix = commonPrefix.Prefix;
          const albumName = decodeURIComponent(prefix.replace('/', ''));
          return getHtml([
            '<li>',
              '<span onclick="deleteAlbum(\'' + albumName + '\')">X</span>',
              '<span onclick="viewAlbum(\'' + albumName + '\')">',
                albumName,
              '</span>',
            '</li>'
          ]);
        });
        var message = albums.length ?
          getHtml([
            '<p>Click on an album name to view it.</p>',
            '<p>Click on the X to delete the album.</p>'
          ]) :
          '<p>You do not have any albums. Please Create album.';
        var htmlTemplate = [
          '<h2>Albums</h2>',
          message,
          '<ul>',
            getHtml(albums),
          '</ul>',
          '<button onclick="createAlbum(prompt(\'Enter Album Name:\'))">',
            'Create New Album',
          '</button>'
        ]
        document.getElementById('app').innerHTML = getHtml(htmlTemplate);
      }
    });
  }
  
  function createAlbum(albumName: string) {
    albumName = albumName.trim();
    if (!albumName) {
      return alert('Album names must contain at least one non-space character.');
    }
    if (albumName.indexOf('/') !== -1) {
      return alert('Album names cannot contain slashes.');
    }
    var albumKey = encodeURIComponent(albumName) + '/';
    const req = {Key: albumKey, Bucket: albumBucketName}
    s3.headObject(req, function(err, data) {
      if (!err) {
        return alert('Album already exists.');
      }
      if (err.code !== 'NotFound') {
        return alert('There was an error creating your album: ' + err.message);
      }
      s3.putObject({Key: albumKey, Bucket: albumBucketName}, function(err, data) {
        if (err) {
          return alert('There was an error creating your album: ' + err.message);
        }
        alert('Successfully created album.');
        viewAlbum(albumName);
      });
    });
  }

  function viewAlbum(albumName: string) {
    var albumPhotosKey = encodeURIComponent(albumName) + '/';
    s3.listObjects({Prefix: albumPhotosKey, Bucket: albumBucketName}, function(err, data) {
      if (err) {
        return alert('There was an error viewing your album: ' + err.message);
      }
      // 'this' references the AWS.Response instance that represents the response
      var href = this.request.httpRequest.endpoint.href;
      var bucketUrl = href + albumBucketName + '/';
  
      var photos = data.Contents.map(function(photo) {
        var photoKey = photo.Key;
        var photoUrl = bucketUrl + encodeURIComponent(photoKey);
        return getHtml([
          '<span>',
            '<div>',
              '<img style="width:128px;height:128px;" src="' + photoUrl + '"/>',
            '</div>',
            '<div>',
              '<span onclick="deletePhoto(\'' + albumName + "','" + photoKey + '\')">',
                'X',
              '</span>',
              '<span>',
                photoKey.replace(albumPhotosKey, ''),
              '</span>',
            '</div>',
          '</span>',
        ]);
      });
      var message = photos.length ?
        '<p>Click on the X to delete the photo</p>' :
        '<p>You do not have any photos in this album. Please add photos.</p>';
      var htmlTemplate = [
        '<h2>',
          'Album: ' + albumName,
        '</h2>',
        message,
        '<div>',
          getHtml(photos),
        '</div>',
        '<input id="photoupload" type="file" accept="image/*">',
        '<button id="addphoto" onclick="addPhoto(\'' + albumName +'\')">',
          'Add Photo',
        '</button>',
        '<button onclick="listAlbums()">',
          'Back To Albums',
        '</button>',
      ]
      document.getElementById('app').innerHTML = getHtml(htmlTemplate);
    });
  }

  function addPhoto(albumName: string) {
    var files = (<HTMLInputElement>document.getElementById('photoupload')).files
    if (!files.length) {
      return alert('Please choose a file to upload first.');
    }
    var file = files[0];
    var fileName = file.name;
    var albumPhotosKey = encodeURIComponent(albumName) + '//';
  
    var photoKey = albumPhotosKey + fileName;
    s3.upload({
      Key: photoKey,
      Body: file,
      ACL: 'public-read',
      Bucket: albumBucketName
    }, function(err, data) {
      if (err) {
        return alert('There was an error uploading your photo: ' + err.message);
      }
      alert('Successfully uploaded photo.');
      viewAlbum(albumName);
    });
  }

  function deletePhoto(albumName: string, photoKey: string) {
    s3.deleteObject({Key: photoKey, Bucket: albumBucketName}, function(err, data) {
      if (err) {
        return alert('There was an error deleting your photo: ' + err.message);
      }
      alert('Successfully deleted photo.');
      viewAlbum(albumName);
    });
  }

  
function deleteAlbum(albumName: string) {
    var albumKey = encodeURIComponent(albumName) + '/';
    s3.listObjects({Prefix: albumKey, Bucket: albumBucketName}, function(err, data) {
      if (err) {
        return alert('There was an error deleting your album: ' + err.message);
      }
      var objects = data.Contents.map(function(object) {
        return {Key: object.Key};
      });
      s3.deleteObjects({
        Delete: {Objects: objects, Quiet: true}, Bucket: albumBucketName
      }, function(err, data) {
        if (err) {
          return alert('There was an error deleting your album: ' + err.message);
        }
        alert('Successfully deleted album.');
        listAlbums();
      });
    });
}
