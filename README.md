# S3ntry
S3ntry is an AWS S3 File Manager Built in Vanilla Javascript. Plug and play on any site. 

- I need to write a tutorial to show you how to setup your bucket. 
*Essentially, lock down the bucket and give the cognito pool access to a role with S3 permissions to list/add/edit/delete objects.*
- I know the code is in one file, that's currently the point.
- The CSS is in the JS and can be moved out if you want to.
- Reach out to me with questions, i'll be glad to help. https://twitter.com/ravavyr

## Features

### TODO 
   - upload screen fix styling, add scrollbar if too many files
   - file upload limit parameter
      - implement parameter into uploader interface and error messages          
   - Add pagination
   - Responsiveness for mobile [do not recommend until performance is improved]
      
   - Create Tutorial
   -- S3 configs [the hardest part]
   -- Explanation of features and functionality

### DONE
   - list folders in bucket
   - create folder
   - file drag and drop uploader
   - upload files to s3
   - list files from s3
   - Folder click to switch folders and show only files for that folder
   - File display updates on switching folders, and on adding/removing files or folders
   - On create folder, check for duplicate, do not allow
   - On create file, prompt to overwrite existing file of same name
   - Delete files
   - File list => added scrolling and responsiveness down to 900px width.
   - Cleaned up look and feel of List View
   - Fixed reload/reinstantiation issue on resize
   - If file upload is selected, close it when navigating to another folder or adding a folder. [also view switch]
   - If add folder is open, close it when navigating to another folder or adding a file [also view switch]
   - File type support is customizable in config
   - Files can now be downloaded
   - Folders can be deleted, will delete all items inside folder
   - Files are now sorted by name
   - Fix breadcrumbs render for subfolders
   - Make breadcrumbs clickable to parent levels
   - Added Example code to render file manager 
