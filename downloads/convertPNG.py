#!/usr/bin/env python
print """
This code was created by Luis Kabongo, Vicomtech-IK4 Copyright 2012-2013.
This application converts the slices found in a folder into a tiled 2D texture 
image in PNG format (it assumes all files in the folder are of the same type 
and dimensions). It uses Python with PIL, numpy and pydicom packages are 
recommended for other formats.
Information links:
http://www.volumerc.org
http://demos.vicomtech.org
Contact mailto:volumerendering@vicomtech.org
"""

import os, errno
import sys
import getopt
import math
import array
from PIL import Image #this is required to manage the images

#This is the default size when loading a Raw image
sizeOfRaw = (512, 512)
#This determines if the endianness should be reversed
rawByteSwap = True

#This function simply loads a PNG file and returns a compatible Image object
def loadPNG(filename):
	return Image.open(filename)

#This function uses the images retrieved with loadImgFunction (whould return a PIL.Image) and
#	writes them as tiles within a new square Image. 
#	Returns a set of Image, size of a slice, number of slices and number of slices per axis
def ImageSlices2TiledImage(filenames, loadImgFunction=loadPNG):
	filenames=sorted(filenames)
	print "Desired load function=", loadImgFunction.__name__
	size = loadImgFunction(filenames[0]).size
	numberOfSlices = len(filenames)
	slicesPerAxis = int(math.ceil(math.sqrt(numberOfSlices)))
	imout = Image.new("L", (size[0]*slicesPerAxis, size[1]*slicesPerAxis))

	i = 0
	for filename in filenames:
		im = loadImgFunction(filename)
		
		row = int( (math.floor(i/slicesPerAxis)) * size[0] )
		col = int( (i%slicesPerAxis) * size[1] )

		box = ( int(col), int(row), int(col+size[0]), int(row+size[1]) )
		imout.paste(im, box)
		i+=1
		print "processed slice  : "+str(i)+"/"+str(numberOfSlices) #filename
	return imout, size, numberOfSlices, slicesPerAxis

#This functions takes a (tiled) image and writes it to a png file with base filename outputFilename.
#	It also writes several versions in different sizes determined by dimensions
def WriteVersions(tileImage,outputFilename,dimensions=[8192,4096,2048,1024]):
	try:
		print 'Creating folder',os.path.dirname(outputFilename),'...',
		os.makedirs(os.path.dirname(outputFilename))
	except OSError as exc:
		if exc.errno == errno.EEXIST and os.path.isdir(os.path.dirname(outputFilename)):
			print 'was already there.'
		else:
			print ', folders might not be created, trying to write anyways...'
	except:
		print "Could not create folders, trying to write anyways..."

	print "Writing complete image: "+outputFilename+"_full.png"
	try:
		tileImage.save(outputFilename+"_full.png", "PNG")
	except:
		print "Failed writing ",outputFilename+"_full.png"
	for dim in dimensions:
		if tileImage.size[0] > dim :
			print "Writing "+str(dim)+"x"+str(dim)+" version: "+outputFilename+"_"+str(dim)+".png"
			tmpImage = tileImage.resize((dim,dim))
			try:
				tmpImage.save(outputFilename+"_"+str(dim)+".png", "PNG")
			except:
				print "Failed writing ",outputFilename,"_",str(dim),".png"

#This function lists the files within a given directory dir
def listdir_fullpath(d):
    return [os.path.join(d, f) for f in os.listdir(d)]

#This is the main program, it takes at least 2 arguments <InputFolder> and <OutputFilename>
def main(argv=None):
	print "Parsing arguments..."
	if argv is None:
		argv = sys.argv

	if len(argv) < 3:
		print "Usage: command <InputFolder> <OutputFilename>"
		print "	<InputFolder> must contain only one set of PNG files to be processed"
		print "	<OutputFilename> must contain the path and base name of the desired output, extension will be added automatically"
		print "Note: this version does not process several folders recursively. "
		print "You typed:", argv
		return 2

	#Filter only png files in the given folder
	filenamesPNG = filter(lambda x: ".png" in x, listdir_fullpath(argv[1]))
	
	#Convert into a tiled image
	if len(filenamesPNG) > 0:
		#From png files
		imgTile, sliceResolution, numberOfSlices, slicesPerAxis = ImageSlices2TiledImage(filenamesPNG,loadPNG)
	else:
		print "No PNG files found in that folder, check your parameters or contact the authors :)."
		return 2
	
	#Write a text file containing the number of slices for reference
	try:
		try:
			print 'Creating folder',os.path.dirname(argv[2]),'...',
			os.makedirs(os.path.dirname(argv[2]))
		except OSError as exc:
			if exc.errno == errno.EEXIST and os.path.isdir(os.path.dirname(argv[2])):
				print 'was already there.'
			else:
				print ', folders might not be created, trying to write anyways...'
		except:
			print ", could not create folders, trying to write anyways..."
		with open(argv[2]+"_AtlasDim.txt",'w') as f:
			f.write(str((numberOfSlices,(slicesPerAxis,slicesPerAxis))))
	except:
		print "Could not write a text file",argv[2]+"_AtlasDim.txt","containing dimensions (total slices, slices per axis):",(numberOfSlices,(slicesPerAxis,slicesPerAxis))
	else:
		print "Created",argv[2]+"_AtlasDim.txt","containing dimensions (total slices, slices per axis):",(numberOfSlices,(slicesPerAxis,slicesPerAxis))

	#Output is written in different sizes
	WriteVersions(imgTile, argv[2])

if __name__ == "__main__":
	sys.exit(main())
