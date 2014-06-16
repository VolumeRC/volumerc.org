#! /usr/bin/env python
# -*- coding: utf-8 -*-
"""
Gradient Atlas Generator

The code was created by Ander Arbelaiz based on Luis Kabongo's atlas converson
tool, Vicomtech-IK4 Copyright 2014-2015.

This application calculates the gradient of a volume and converts the volume
data slices into a tiled 2D texture image in PNG format (it assumes all files
in the folder are of the same type and dimensions).
It requires Python with PIL, numpy, matplolib and ndimage packages. 
pydicom and pynrrd packages are needed for dicom and nrrd file type formats.

Information links:
http://www.volumerc.org
http://demos.vicomtech.org
Contact mailto:volumerendering@vicomtech.org
"""
import numpy as np
import matplotlib.pyplot as plt
from scipy import ndimage, misc
#from PIL import Image
import nrrd
import dicom
import math
import argparse
import os, errno

#######################
#  Exception Handlers #
#######################
class FormatException(Exception):
    """Exception. File format not supported!"""
    pass

class VolumeFileReaderException(Exception):
    """Incorrect file input used, or not posible to load."""
    pass

class GradientCalculationException(Exception):
    """Error while generating the gradient, whith the ndimage library."""
    pass

##################################
# Gradient and data manipulation #
##################################
class GradientCalculation:
    """This class uses the ndimage library from the scipy package to calculate
    the gradient and gradient magnitude. Posible gradient operators are: 
        * Prewitt
        * Gauss
        * Sobel
        * central-differences
        * forward-differences
    """
    
    @staticmethod
    def normalize(inputData):
        old_min = inputData.min()
        old_range = inputData.max()-old_min
        return (inputData-old_min)/old_range
        
    @staticmethod
    def normalize_range(inputData, newMin, newMax):
        """Image normalization between a given range"""
        oldMin = inputData.min()
        oldRange = inputData.max()-oldMin
        newRange = newMax-newMin
        return (inputData-oldMin)*(newRange/oldRange)+newMin
        
    @staticmethod    
    def gaussFilterRGB(inputData, sigmaValue=1):
        #Initialize an array with the same shape as the input data for each color channel
        r = np.zeros(inputData.shape)
        g = np.zeros(inputData.shape)
        b = np.zeros(inputData.shape)
        #Calculate the gaussian filter on each axis
        ndimage.gaussian_filter1d(inputData, sigma=sigmaValue, axis=1, order=1, output=r)
        ndimage.gaussian_filter1d(inputData, sigma=sigmaValue, axis=0, order=1, output=g)
        ndimage.gaussian_filter1d(inputData, sigma=sigmaValue, axis=2, order=1, output=b)
        #Compose each chanel on an array structure 
        return GradientCalculation.normalize(np.concatenate((r[...,np.newaxis],g[...,np.newaxis],b[...,np.newaxis]),axis=3))
    
    @staticmethod
    def prewittFilterRGB(inputData):
        r = np.zeros(inputData.shape)
        g = np.zeros(inputData.shape)
        b = np.zeros(inputData.shape)
        ndimage.prewitt(inputData, axis=1, output=r)
        ndimage.prewitt(inputData, axis=0, output=g)
        ndimage.prewitt(inputData, axis=2, output=b)
        return GradientCalculation.normalize(np.concatenate((r[...,np.newaxis],g[...,np.newaxis],b[...,np.newaxis]),axis=3))
    
    @staticmethod    
    def sobelFilterRGB(inputData):
        r = np.zeros(inputData.shape)
        g = np.zeros(inputData.shape)
        b = np.zeros(inputData.shape)
        ndimage.sobel(inputData, axis=1, output=r)
        ndimage.sobel(inputData, axis=0, output=g)
        ndimage.sobel(inputData, axis=2, output=b)
        return GradientCalculation.normalize(np.concatenate((r[...,np.newaxis],g[...,np.newaxis],b[...,np.newaxis]),axis=3))
        
    @staticmethod    
    def centralDifferencesRGB(inputData):
        r = np.zeros(inputData.shape)
        g = np.zeros(inputData.shape)
        b = np.zeros(inputData.shape)
        ndimage.correlate1d(inputData, [-1, 0, 1], axis=1, output=r)
        ndimage.correlate1d(inputData, [-1, 0, 1], axis=0, output=g)
        ndimage.correlate1d(inputData, [-1, 0, 1], axis=2, output=b)
        r = GradientCalculation.normalize_range(r, 0, 1)
        g = GradientCalculation.normalize_range(g, 0, 1)
        b = GradientCalculation.normalize_range(b, 0, 1) 
        return np.concatenate((r[...,np.newaxis],g[...,np.newaxis],b[...,np.newaxis]),axis=3)
        
    @staticmethod
    def forwardDifferencesRGB(inputData):
        r = np.zeros(inputData.shape)
        g = np.zeros(inputData.shape)
        b = np.zeros(inputData.shape)
        ndimage.correlate1d(inputData, [-1, 1], origin=-1, axis=1, output=r)
        ndimage.correlate1d(inputData, [-1, 1], origin=-1, axis=0, output=g)
        ndimage.correlate1d(inputData, [-1, 1], origin=-1, axis=2, output=b)
        return GradientCalculation.normalize(np.concatenate((r[...,np.newaxis],g[...,np.newaxis],b[...,np.newaxis]),axis=3))
    
    @staticmethod
    def gaussMagnitudeRGB(inputData):
        pass
    

#########################
# Multidimensional data #
#########################
class VolumeData:
    """The volume data class is a wrapper for a ndarray containing the volume data."""

    def __init__(self, ndarray, a_type, header_info=None):
        """Volume data constructor"""
        self.data = ndarray # numpy array containing the volume data
        self.type = a_type # Volume data array_type
        self.gradient = None # Not calculated yet
        self.header=header_info # Usually for nrrd files
        self._checkPaddingAndSize()
    
    def _checkPaddingAndSize(self):
        #TODO: If the data is not of the same size on (x,y)
        pass
    
    def getAtlas(self):
        """Returns a numpy array, containing the 2D image of the volume data atlas"""
        volumeSize = (self.data.shape[0], self.data.shape[1])
        numberOfSlices = self.data.shape[2]
        slicesPerAxis = int(math.ceil(math.sqrt(numberOfSlices)))
        atlasArray = np.zeros((volumeSize[0]*slicesPerAxis, volumeSize[1]*slicesPerAxis))
        
        for i in range(0, numberOfSlices):
            row = int((math.floor(i/slicesPerAxis)) * volumeSize[0])
            col = int((i%slicesPerAxis) * volumeSize[1])
            box = (row, col, int(row+volumeSize[0]), int(col+volumeSize[1]))
            atlasArray[box[0]:box[2],box[1]:box[3]] = self.data[:,:,i]
        
        return atlasArray
        
    def getGradientAtlas(self):
        """Returns a numpy array, containing the 2D image of the gradient atlas"""
        if self.gradient != None:
            volumeSize = (self.gradient.shape[0], self.gradient.shape[1])
            numberOfSlices = self.gradient.shape[2]
            slicesPerAxis = int(math.ceil(math.sqrt(numberOfSlices)))
            atlasArray = np.zeros((volumeSize[0]*slicesPerAxis, volumeSize[1]*slicesPerAxis,3))
            
            for i in range(0, numberOfSlices):
                row = int((math.floor(i/slicesPerAxis)) * volumeSize[0])
                col = int((i%slicesPerAxis) * volumeSize[1])
                box = (row, col, int(row+volumeSize[0]), int(col+volumeSize[1]))
                atlasArray[box[0]:box[2],box[1]:box[3],:] = self.gradient[:,:,i,:]
            
            return atlasArray
        else:
            print 'The gradient must be prviously computed!'
            
    def calculateGradientRGB(self, method='gauss'):
        """Calculates the gradient data from the volume data"""
        try:
            self.gradient = ({'gauss':GradientCalculation.gaussFilterRGB, 'sobel':GradientCalculation.sobelFilterRGB, \
            'prewitt':GradientCalculation.prewittFilterRGB, 'central-differences':GradientCalculation.centralDifferencesRGB}[method])(self.data)
        except KeyError:
            raise GradientCalculationException('Method %s is not suported.' % method)
        pass
    
    def calculateGradientMagnitudeRGB(self, method='gauss'):
        """Calculates the gradient magnitude data from the volume data"""
        #TODO, calculate the gradient magnitude
        pass
    
    def showSlice(self, num):
        """Display a given slice"""
        plt.imshow(self.data[:,:,num], cmap=plt.cm.gray)
    
    def showGradientAndDataSlices(self, num):
        """Display the gradient and volume data from a given slice"""
        plt.figure(1)
        plt.imshow(self.data[:,:,num], cmap=plt.cm.gray)
        if self.gradient != None:
            plt.figure(2)
            plt.imshow(self.gradient[:,:,num], cmap=plt.cm.gray)
            plt.figure(1)
    
    def showAtlas(self):
        """Display the volume data atlas"""
        plt.imshow(self.getAtlas(), cmap=plt.cm.gray)
    
    def showGradientAtlas(self):
        """Display the gradient data atlas"""
        if self.gradient != None:
            plt.imshow(self.getGradientAtlas(), cmap=plt.cm.gray)
        else:
            print 'The gradient must be previously computed!'

############################
# File Reader and loading #
############################
class VolumeFileReader:
    """Volume File Reader class. Creates a VolumeData object instance from a volume file
    name and path. Supported file types, nrrd, dicom, raw, jpg, png"""
    data = None
    def __init__(self, filePath):
        self.path = filePath
        self.fileList = []
        self.loaded = False
        #Detect if there is more than one file
        if(os.path.isfile(filePath)):
            self._obtainExtensionAndName(filePath)
        else:
            if(os.path.isdir(filePath)):
                filenames = os.listdir(filePath)
                for f in filenames:
                    if f.endswith(('.jpg', 'jpeg', '.giff', '.tiff', '.png', '.dcm')):
                        self.fileList.append(os.path.join(filePath, f))
                self.fileList.sort() #Alphabetically sort the list, because it could be read randomly
            else:
                raise VolumeFileReaderException("Incorrect use of input file. Can not open file/files!")
    
    def _obtainExtensionAndName(self, filePath):
        """Extracts the file name and file extension fron a given full file path"""
        self.fileName, self.fileExtension = os.path.splitext(filePath)
        
    def _readNrrd(self):
        """Loads a nrrd file, it uses the pynrrd package"""
        try:
            self.data, header_info = nrrd.read(self.path)
            print header_info
        except:
            print 'Error reading the nrrd file!'
            print 'You need pynrrd package. sudo easy_install pynrrd'
            exit()
    
    def _readDicom(self, fileName):
        """Loads a dicom file using the pydicom package"""
        try:
            dicomFile = dicom.read_file(fileName, force=True)
        except:
            print 'Error reading the dicom file!'
            print 'You need dicom package, sudo easy_install pydicom'
        
        arr = dicomFile.pixel_array.astype(np.float64)
        
        if ('RescaleIntercept' in dicomFile) and ('RescaleSlope' in dicomFile):
            intercept = dicomFile.RescaleIntercept  # single value
            slope = dicomFile.RescaleSlope
            arr = slope * arr + intercept
        
        # get default window_center and window_width values
        wc = (arr.max() + arr.min()) / 2.0
        ww = arr.max() - arr.min() + 1.0
        #get window_center and window_width is setted
        if ('WindowCenter' in dicomFile) and ('WindowWidth' in dicomFile):
            wc = dicomFile.WindowCenter
            # width >= 1 (DICOM standard)
            ww = max(1, dicomFile.WindowWidth)
            if isinstance(wc, list):
                wc = wc[0]
            if isinstance(ww, list):
                ww = ww[0]
                
        # LUT-specific array scaling
        wc, ww = np.float64(wc), np.float64(ww)
        lut_max, lut_min = np.float64(255), np.float64(0)
        lut_range = lut_max - lut_min
        
        minval = wc - 0.5 - (ww - 1.0) / 2.0
        maxval = wc - 0.5 + (ww - 1.0) / 2.0
        min_mask = (minval >= arr)
        to_scale = (arr > minval) & (arr < maxval)
        max_mask = (arr >= maxval)
        
        if min_mask.any():
            arr[min_mask] = lut_min
        if to_scale.any():
            arr[to_scale] = ((arr[to_scale] - (wc - 0.5)) /
            (ww - 1.0) + 0.5) * lut_range + lut_min
        if max_mask.any():
            arr[max_mask] = lut_max
        
        # round to next integer values and convert to unsigned int
        return np.rint(arr).astype(np.uint8)
    
    def _readRaw(self, sizeInput=(512,512), slides=512, dataType='uint8'):
        """Loads a raw file with a given volume data dimensions and data type. """
        f = open(self.path, "rb")
        try:
            first_time = True
            for _ in range((slides-1)):
                if first_time:
                    self.data = np.fromfile(f, dataType, sizeInput[0]*sizeInput[1]).reshape(sizeInput)
                    first_time = False                    
                raw = np.fromfile(f, dataType, sizeInput[0]*sizeInput[1]).reshape(sizeInput)
                self.data = np.dstack((self.data, raw))
            self.loaded = True
        except EOFError:
            return self.data
        except ValueError:
            print 'Warning!! ValueError when reshaping the data, continuing anyway!'
            self.loaded = True
        finally:
            f.close()
        
    def loadFile(self, imageSize=(None,None), numberOfSlices=None, dataType='uint8'):
        """Loads the file or images containing the volume data into a numpy array"""
        if not self.loaded:
            if self.fileList:
                if self.fileList[0].endswith('.dcm'):
                    #Dicom files
                    self.data = self._readDicom(self.fileList[0])
                    for i in range(1, len(self.fileList)):
                        self.data = np.dstack((self.data, self._readDicom(self.fileList[i])))
                else:
                    #Standard image extensions
                    self.data = ndimage.imread(self.fileList[0], flatten=True)
                    #Uses PIL to load the images
                    for i in range(1, len(self.fileList)):
                        self.data = np.dstack((self.data, ndimage.imread(self.fileList[i], flatten=True)))
                self.loaded = True
            else:
                #Check by file extension
                if self.fileExtension == '.nrrd':
                    self._readNrrd()
                    self.loaded = True
                elif self.fileExtension == '.raw':
                    if numberOfSlices != None and imageSize != None:
                        self._readRaw(imageSize,numberOfSlices,dataType)
                        self.loaded = True
                    else:
                        raise VolumeFileReaderException('Image size and number of slices not specified!!')
                else:
                    raise FormatException('Not supported file extension!')
                    
    def getVolumeDataInstance(self):
        """Returns the loaded VolumeData instance."""
        if self.loaded:
            return VolumeData(self.data, 'nrrd')
    
################
# Data Writing #
################   
class VolumeFileWriter:
    """This class takes a VolumeData instance, and allows to save it in a file for various
    formats or as image slices"""
    
    def __init__(self, volume_data):
        """Class constructor"""
        self.volumeData = volume_data
        
    def _checkOutputDirPath(self, path):
        """Checks if the path contains a folder. If not, it is created"""
        try:
            os.makedirs(os.path.dirname(path))
        except OSError as e:
            if e == errno.EEXIST or os.path.isdir(os.path.dirname(path)):
                print 'Output folder already exists. Writing in it...'
            else:
                print 'Folder might not be created, trying to write anyways...'
        except:
            print 'Could not create folder, trying to write anyways..'
    
    def _saveImage(self, imageArray, path, name, resolution=None, mode=None, f_format='.png'):
        """Saves a 2D numpy array into an image file format."""
        try:
            if resolution == None:
                resolution = (imageArray.shape[0],imageArray.shape[1])                
            self._checkOutputDirPath(path)
            atlasImg = misc.toimage(imageArray, mode=mode)            
            atlasImg.save(path+name+f_format)
        except FormatException:
            print 'Not valid operation!'
    
    def _saveAsImageSlices(self, ndarray, path, name, resolution=None, mode=None, f_format='.png'):
        """Saves each slice from a numpy array as an image"""
        try:
            self._checkOutputDirPath(path)
            for i in range(0, ndarray.shape[2]):
                atlasImg = misc.toimage(ndarray[:,:,i], mode=mode)
                atlasImg.save(path+name+("%04d" % i)+f_format)
        except FormatException:
            print 'Not valid operation!'
        except:
            print 'Warning, could not save image slices!'
            return -1
            
    def saveAtlas(self, path, name, resolution=None, mode=None, f_format=".png"):
        """Save the volume data atlas into a image"""
        self._saveImage(self.volumeData.getAtlas(), path+name+'_atlas/', name, resolution, mode, f_format)
    
    def saveGradientAtlas(self, path, name, resolution=None, mode=None, f_format=".png"):
        """Save the gradient data into a image"""
        self._saveImage(self.volumeData.getGradientAtlas(), path+name+'_atlas/', name+'_gradient', resolution, mode, f_format)
    
    def saveDataSlices(self, path, name, resolution=None, f_format=".png"):
        """Save each volume and gradient data slices into images"""
        if self.volumeData.data != None:
            self._saveAsImageSlices(self.volumeData.data, path+name+"_slices/data/", name, resolution, None, f_format)
        if self.volumeData.gradient != None:
            self._saveAsImageSlices(self.volumeData.gradient, path+name+"_slices/gradient/", name, resolution, "RGB", f_format)
    
    @staticmethod
    def saveArrayAsNrrd(): #TODO
        pass
    
    @staticmethod
    def saveArrayAsDicom(): #TODO
        pass
    
    @staticmethod
    def saveArrayAsRaw(): #TODO
        pass
    
    def saveFileInformation(self, path, name='_AtlasDim.txt'):
        """Save information about the volume data"""
        try:
            self._checkOutputDirPath(path)
            volumeShape = self.volumeData.data.shape
            slicesPerAxis = int(math.ceil(math.sqrt(volumeShape[2])))
            with open(path+name, 'w') as f:
                f.write('Volume data saved using the Gradient atlas Generator\n')
                f.write('Shape info:\n')
                f.write(str((volumeShape[2],(volumeShape[0],volumeShape[1]))))
                f.write('\n')
                f.write('Atlas to be used with x3dom:\n')
                f.write('<ImageTextureAtlas numberOfSlices="'+str(volumeShape[2])+'" slicesOverX="'+str(slicesPerAxis)+'" slicesOverY="'+str(slicesPerAxis)+'"></ImageTextureAtlas>')
        except:
            print 'Error!, could not write information text file '+ name
    
######################################
# Main program - CLI with argparse - #
######################################
def main(argv=None):
    parser = argparse.ArgumentParser(prog='Gradient Atlas Generator', \
        description='''Volume gradient calculation and atlas generation utility''',
        epilog='''Gradient Atlas Generator

This application calculates the gradient of a volume and converts the volume
data slices into a tiled 2D texture image in PNG format (it assumes all files
in the folder are of the same type and dimensions).
It requires Python with PIL, numpy, matplolib and ndimage packages. 
pydicom and pynrrd packages are needed for dicom and nrrd file type formats.

The code was created by Ander Arbelaiz based on Luis Kabongo's atlas converson
tool. Vicomtech-IK4 Copyright 2014-2015.

Information links:
http://www.volumerc.org
http://demos.vicomtech.org
Contact mailto:volumerendering@vicomtech.org ''')
    parser.add_argument('input', type=str, help='The input file or folder containig the volume image slices')
    parser.add_argument('outputdir', type=str, help='The output directory path (if it does not exist it will be created)')
    parser.add_argument('outputname', type=str, help='The output file(s) base name')
    parser.add_argument('--size', type=int, nargs=3, metavar=('x','y','z'), help='Size of input images x y z, only specify with raw files. The third value (z) is the number of slices')
    parser.add_argument('--dtype', type=str, default='uint8', help='The data type')    
    parser.add_argument('--slices', '-l', action='store_true')
    parser.add_argument('--not_atlas', '-na', action='store_true')
    #parser.add_argument('--resolution', '-r', type=str, default='full', choices=['4096','2048','1024','512','256'], help='The ouptut atlas resolution, if not specified all resolutions will be used')
    parser.add_argument('--method', '-m', type=str, default='gauss', choices=['gauss','sobel','prewitt','central-differences', 'forward-differences'], help='The method used to generate the gradient.')    
    #parser.add_argument('--saveAs', '-s', type=str, default=None, choices=['.nrrd','.dicom','.raw'], help='Save the computed volume gradient into a file')    
    parser.add_argument('--version', action='version', version='%(prog)s 0.1b')

    #Obtain the parsed arguments
    arguments = parser.parse_args()
    print 'Step 1/3 Reading the volume data' 
    volume = VolumeFileReader(arguments.input)
    #Try loading the volume file or image slices
    try:
        if arguments.size and arguments.dtype:
            volume.loadFile((arguments.size[1],arguments.size[1]), arguments.size[2], arguments.dtype)
        else:
            volume.loadFile()
        volumeData = volume.getVolumeDataInstance()
    except:
        print 'Error while loading the volume data!'
        return -1
    
    #Calculate the gradient from the volumedata
    print 'Step 2/3 Calculating the gradient...'
    try:
        volumeData.calculateGradientRGB(arguments.method)
        volumeData.calculateGradientMagnitudeRGB(arguments.method)
    except:
        print 'Error while calculating the gradient..'
        return -1
    
    #Saving the atlas from the volumedata
    print 'Step 3/3 Saving the output file(s)...'
    try:
        volumeWriter = VolumeFileWriter(volumeData)
        
        if arguments.not_atlas == False:
            volumeWriter.saveAtlas(arguments.outputdir, arguments.outputname)
            volumeWriter.saveGradientAtlas(arguments.outputdir, arguments.outputname)
            volumeWriter.saveFileInformation(arguments.outputdir)
        if arguments.slices:
            volumeWriter.saveDataSlices(arguments.outputdir, arguments.outputname)
        if arguments.saveAs != None:
            print 'NIY!'
    except:
        print 'Sorry :(, error while saving the ouput file(s)!'
        return -1

if __name__ == "__main__":
	main()