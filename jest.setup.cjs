require('@testing-library/jest-dom');

// jsdom's File/Blob don't implement text() yet; CsvUploader relies on it to read uploads.
if (typeof File !== 'undefined' && !File.prototype.text) {
  File.prototype.text = function () {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(this);
    });
  };
}
