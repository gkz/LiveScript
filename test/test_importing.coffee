# Check if we can import and execute a Coco-only module successfully.
if require?.extensions or require?.registerExtension
  eq require('./test_module').func(), 'from over there'
